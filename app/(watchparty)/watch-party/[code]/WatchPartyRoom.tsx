"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Peer, { DataConnection, MediaConnection } from "peerjs";

interface Member {
  name: string;
  peerId: string | null;
  isHost: boolean;
}

interface ChatMsg {
  id: string;
  from: string;
  text: string;
  ts: number;
}

interface EmojiBlast {
  id: string;
  emoji: string;
  from: string;
  x: number;
}

type WireMsg =
  | { type: "play"; time: number }
  | { type: "pause" }
  | { type: "seek"; time: number }
  | { type: "url"; url: string; contentType: string }
  | { type: "sync-check"; time: number }
  | { type: "member-join"; name: string; peerId: string; isHost: boolean }
  | { type: "member-leave"; name: string }
  | { type: "members-sync"; members: Member[] }
  | { type: "chat"; id: string; from: string; text: string; ts: number }
  | { type: "emoji"; id: string; emoji: string; from: string };

const QUICK_EMOJIS = ["🔥", "😂", "❤️", "👏", "😮", "💀", "🎉", "👀"];

function extractYouTubeId(url: string): string | null {
  const m =
    url.match(/(?:youtube\.com\/watch\?v=)([^&\s]+)/) ||
    url.match(/(?:youtu\.be\/)([^?\s]+)/) ||
    url.match(/(?:youtube\.com\/embed\/)([^?\s]+)/);
  return m ? m[1] : null;
}

function detectContentType(url: string): "youtube" | "video" | "iframe" {
  if (extractYouTubeId(url)) return "youtube";
  if (/\.(mp4|webm|ogg|m3u8)(\?|$)/i.test(url)) return "video";
  return "iframe";
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export default function WatchPartyRoom({ code }: { code: string }) {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-[#0a0a0a] text-gray-500">
          Loading room...
        </div>
      }
    >
      <RoomInner code={code} />
    </Suspense>
  );
}

function RoomInner({ code }: { code: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const userName = searchParams.get("name") || "Guest";
  const isHost = searchParams.get("host") === "1";

  const [members, setMembers] = useState<Member[]>([]);
  const [contentUrl, setContentUrl] = useState<string | null>(null);
  const [contentType, setContentType] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [muted, setMuted] = useState(true);
  const [copiedWhat, setCopiedWhat] = useState<"" | "code" | "link">("");
  const [connected, setConnected] = useState(false);
  const [micError, setMicError] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [emojiBlasts, setEmojiBlasts] = useState<EmojiBlast[]>([]);

  const peerRef = useRef<Peer | null>(null);
  const dataConns = useRef<Map<string, DataConnection>>(new Map());
  const mediaConns = useRef<Map<string, MediaConnection>>(new Map());
  const localStream = useRef<MediaStream | null>(null);
  const ytPlayer = useRef<YT.Player | null>(null);
  const videoEl = useRef<HTMLVideoElement | null>(null);
  const ignoring = useRef(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const membersRef = useRef<Member[]>([]);
  const seenMsgIds = useRef(new Set<string>());
  const audioCtxRef = useRef<AudioContext | null>(null);

  const stateRef = useRef({ contentUrl: null as string | null, contentType: null as string | null, isHost });
  stateRef.current = { contentUrl, contentType, isHost };

  function getCurrentTime(): number {
    if (stateRef.current.contentType === "youtube" && ytPlayer.current) {
      return ytPlayer.current.getCurrentTime?.() || 0;
    }
    if (videoEl.current) return videoEl.current.currentTime;
    return 0;
  }

  function broadcast(msg: WireMsg) {
    dataConns.current.forEach((c) => {
      if (c.open) c.send(msg);
    });
  }

  function updateMembers(fn: (prev: Member[]) => Member[]) {
    setMembers((prev) => {
      const next = fn(prev);
      membersRef.current = next;
      return next;
    });
  }

  function addChat(msg: ChatMsg) {
    if (seenMsgIds.current.has(msg.id)) return;
    seenMsgIds.current.add(msg.id);
    setChatMessages((prev) => [...prev.slice(-100), msg]);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  function spawnEmoji(blast: EmojiBlast) {
    if (seenMsgIds.current.has(blast.id)) return;
    seenMsgIds.current.add(blast.id);
    setEmojiBlasts((prev) => [...prev, blast]);
    setTimeout(() => {
      setEmojiBlasts((prev) => prev.filter((e) => e.id !== blast.id));
    }, 2500);
  }

  function applySync(msg: WireMsg) {
    const ct = stateRef.current.contentType;
    switch (msg.type) {
      case "play":
        ignoring.current = true;
        if (ct === "youtube" && ytPlayer.current) {
          ytPlayer.current.seekTo(msg.time, true);
          ytPlayer.current.playVideo();
        } else if (videoEl.current) {
          videoEl.current.currentTime = msg.time;
          videoEl.current.play();
        }
        setTimeout(() => { ignoring.current = false; }, 300);
        break;
      case "pause":
        ignoring.current = true;
        if (ct === "youtube" && ytPlayer.current) ytPlayer.current.pauseVideo();
        else if (videoEl.current) videoEl.current.pause();
        setTimeout(() => { ignoring.current = false; }, 300);
        break;
      case "seek":
        ignoring.current = true;
        if (ct === "youtube" && ytPlayer.current) ytPlayer.current.seekTo(msg.time, true);
        else if (videoEl.current) videoEl.current.currentTime = msg.time;
        setTimeout(() => { ignoring.current = false; }, 300);
        break;
      case "url":
        setContentUrl(msg.url);
        setContentType(msg.contentType || detectContentType(msg.url));
        break;
      case "sync-check":
        if (msg.time !== undefined) {
          const diff = Math.abs(getCurrentTime() - msg.time);
          if (diff > 1) {
            ignoring.current = true;
            if (ct === "youtube" && ytPlayer.current) ytPlayer.current.seekTo(msg.time, true);
            else if (videoEl.current) videoEl.current.currentTime = msg.time;
            setTimeout(() => { ignoring.current = false; }, 300);
          }
        }
        break;
      case "member-join":
        updateMembers((prev) => {
          if (prev.find((m) => m.name === msg.name)) return prev;
          return [...prev, { name: msg.name, peerId: msg.peerId, isHost: msg.isHost }];
        });
        break;
      case "member-leave":
        updateMembers((prev) => prev.filter((m) => m.name !== msg.name));
        break;
      case "members-sync":
        updateMembers(() => msg.members);
        break;
      case "chat":
        addChat({ id: msg.id, from: msg.from, text: msg.text, ts: msg.ts });
        break;
      case "emoji":
        spawnEmoji({ id: msg.id, emoji: msg.emoji, from: msg.from, x: 10 + Math.random() * 80 });
        break;
    }
  }

  function wireData(conn: DataConnection) {
    conn.on("data", (raw) => applySync(raw as WireMsg));
    conn.on("open", () => {
      dataConns.current.set(conn.peer, conn);
      if (stateRef.current.isHost) {
        if (stateRef.current.contentUrl) {
          conn.send({ type: "url", url: stateRef.current.contentUrl, contentType: stateRef.current.contentType } as WireMsg);
          setTimeout(() => {
            conn.send({ type: "sync-check", time: getCurrentTime() } as WireMsg);
          }, 1500);
        }
        conn.send({ type: "members-sync", members: membersRef.current } as WireMsg);
      }
    });
    conn.on("close", () => dataConns.current.delete(conn.peer));
  }

  function playRemoteStream(peerId: string, stream: MediaStream) {
    const existingAudio = document.getElementById(`audio-${peerId}`) as HTMLAudioElement | null;
    if (existingAudio) existingAudio.remove();

    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") ctx.resume();
    const source = ctx.createMediaStreamSource(stream);
    source.connect(ctx.destination);

    const el = document.createElement("audio");
    el.id = `audio-${peerId}`;
    el.srcObject = stream;
    el.autoplay = true;
    el.setAttribute("playsinline", "true");
    el.volume = 1;
    el.style.cssText = "position:absolute;left:-9999px;";
    document.body.appendChild(el);
    el.play().catch(() => {
      const resume = () => {
        el.play().catch(() => {});
        if (ctx.state === "suspended") ctx.resume();
      };
      document.addEventListener("click", resume, { once: true });
      document.addEventListener("touchstart", resume, { once: true });
    });
  }

  function dialPeer(remotePeerId: string) {
    const peer = peerRef.current;
    if (!peer || dataConns.current.has(remotePeerId) || remotePeerId === peer.id) return;
    const dc = peer.connect(remotePeerId, { reliable: true });
    wireData(dc);
    if (localStream.current) {
      const mc = peer.call(remotePeerId, localStream.current);
      mc.on("stream", (s) => playRemoteStream(remotePeerId, s));
      mediaConns.current.set(remotePeerId, mc);
    }
  }

  useEffect(() => {
    let dead = false;

    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        s.getAudioTracks().forEach((t) => (t.enabled = false));
        localStream.current = s;
      } catch {
        setMicError("Mic access denied");
      }

      const peer = new Peer({
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" },
            { urls: "stun:stun3.l.google.com:19302" },
            { urls: "stun:stun4.l.google.com:19302" },
            { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
            { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
            { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
          ],
        },
      });
      peerRef.current = peer;

      peer.on("open", async (myId) => {
        if (dead) return;
        setConnected(true);
        await fetch(`/api/watch-party/${code}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ peerId: myId, memberName: userName }),
        });
        const res = await fetch(`/api/watch-party/${code}`);
        const d = await res.json();
        if (d.room) {
          updateMembers(() => d.room.members);
          if (d.room.contentUrl) {
            setContentUrl(d.room.contentUrl);
            setContentType(d.room.contentType || detectContentType(d.room.contentUrl));
          }
          d.room.members.forEach((m: Member) => {
            if (m.peerId && m.peerId !== myId) dialPeer(m.peerId);
          });
        }
        broadcast({ type: "member-join", name: userName, peerId: myId, isHost });
      });

      peer.on("connection", (c) => wireData(c));

      peer.on("call", (call) => {
        call.answer(localStream.current || new MediaStream());
        call.on("stream", (s) => playRemoteStream(call.peer, s));
        mediaConns.current.set(call.peer, call);
      });

      peer.on("error", (e) => console.error("Peer error:", e.type, e));
    })();

    const poll = setInterval(async () => {
      if (dead) return;
      try {
        const r = await fetch(`/api/watch-party/${code}`);
        const d = await r.json();
        if (d.room) {
          updateMembers(() => d.room.members);
          const myId = peerRef.current?.id;
          if (myId) {
            d.room.members.forEach((m: Member) => {
              if (m.peerId && m.peerId !== myId && !dataConns.current.has(m.peerId)) dialPeer(m.peerId);
            });
          }
        }
      } catch { /* ignore */ }
    }, 4000);

    return () => {
      dead = true;
      clearInterval(poll);
      broadcast({ type: "member-leave", name: userName });
      dataConns.current.forEach((c) => c.close());
      mediaConns.current.forEach((c) => c.close());
      localStream.current?.getTracks().forEach((t) => t.stop());
      document.querySelectorAll("audio[id^='audio-']").forEach((el) => el.remove());
      audioCtxRef.current?.close().catch(() => {});
      peerRef.current?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, userName]);

  useEffect(() => {
    if (!isHost || !contentUrl) return;
    const id = setInterval(() => {
      broadcast({ type: "sync-check", time: getCurrentTime() });
    }, 3000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, contentUrl]);

  const emitPlay = () => { if (!ignoring.current) broadcast({ type: "play", time: getCurrentTime() }); };
  const emitPause = () => { if (!ignoring.current) broadcast({ type: "pause" }); };
  const emitSeek = () => { if (!ignoring.current) broadcast({ type: "seek", time: getCurrentTime() }); };

  const toggleMute = () => {
    const track = localStream.current?.getAudioTracks()[0];
    if (!track) return;
    if (audioCtxRef.current?.state === "suspended") audioCtxRef.current.resume();
    const next = !muted;
    track.enabled = !next;
    setMuted(next);
  };

  const shareUrl = () => {
    const u = urlInput.trim();
    if (!u) return;
    const t = detectContentType(u);
    setContentUrl(u);
    setContentType(t);
    setUrlInput("");
    broadcast({ type: "url", url: u, contentType: t });
    fetch(`/api/watch-party/${code}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contentUrl: u, contentType: t }) });
  };

  const sendChat = () => {
    const text = chatInput.trim();
    if (!text) return;
    const msg: ChatMsg = { id: uid(), from: userName, text, ts: Date.now() };
    addChat(msg);
    broadcast({ type: "chat", ...msg });
    setChatInput("");
  };

  const sendEmoji = (emoji: string) => {
    const blast: EmojiBlast = { id: uid(), emoji, from: userName, x: 10 + Math.random() * 80 };
    spawnEmoji(blast);
    broadcast({ type: "emoji", id: blast.id, emoji, from: userName });
  };

  const copyCode = () => { navigator.clipboard.writeText(code); setCopiedWhat("code"); setTimeout(() => setCopiedWhat(""), 2000); };
  const copyLink = () => { navigator.clipboard.writeText(`${window.location.origin}/watch-party?join=${code}`); setCopiedWhat("link"); setTimeout(() => setCopiedWhat(""), 2000); };

  const leaveRoom = () => {
    broadcast({ type: "member-leave", name: userName });
    router.push("/watch-party");
    fetch(`/api/watch-party/${code}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ removeMember: userName }) });
  };

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a] text-white overflow-hidden relative">
      {/* Emoji Blasts */}
      {emojiBlasts.map((b) => (
        <div
          key={b.id}
          className="fixed pointer-events-none z-50 animate-emoji-rise"
          style={{ left: `${b.x}%`, bottom: "10%" }}
        >
          <div className="flex flex-col items-center">
            <span className="text-5xl drop-shadow-lg">{b.emoji}</span>
            <span className="text-[10px] text-white/70 mt-1 bg-black/40 px-1.5 py-0.5 rounded">{b.from}</span>
          </div>
        </div>
      ))}
      <style>{`
        @keyframes emoji-rise {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          50% { opacity: 1; transform: translateY(-120px) scale(1.3); }
          100% { opacity: 0; transform: translateY(-260px) scale(0.8); }
        }
        .animate-emoji-rise { animation: emoji-rise 2.5s ease-out forwards; }
      `}</style>

      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-black/50 backdrop-blur shrink-0">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? "bg-[#4CAF50]" : "bg-red-500"}`} />
          <span className="font-mono text-lg tracking-wider">{code}</span>
          <button onClick={copyCode} className="text-xs px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
            {copiedWhat === "code" ? "Copied!" : "Copy Code"}
          </button>
          <button onClick={copyLink} className="text-xs px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
            {copiedWhat === "link" ? "Copied!" : "Copy Link"}
          </button>
          {isHost && <span className="text-xs px-2 py-0.5 rounded bg-[#4CAF50]/20 text-[#4CAF50]">Host</span>}
        </div>
        <button onClick={leaveRoom} className="text-sm px-4 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
          Leave
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Player + Voice Bar */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 relative bg-black flex items-center justify-center">
            {!contentUrl && (
              <div className="text-gray-600 text-center">
                <svg className="w-14 h-14 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm">Share a link to start watching</p>
              </div>
            )}
            {contentUrl && contentType === "youtube" && (
              <YouTubePlayer videoId={extractYouTubeId(contentUrl) || ""} onReady={(p) => { ytPlayer.current = p; }} onPlay={emitPlay} onPause={emitPause} onSeek={emitSeek} />
            )}
            {contentUrl && contentType === "video" && (
              <video ref={videoEl} src={contentUrl} className="w-full h-full" controls onPlay={emitPlay} onPause={emitPause} onSeeked={emitSeek} />
            )}
            {contentUrl && contentType === "iframe" && (
              <iframe src={contentUrl} className="w-full h-full border-0" allowFullScreen allow="autoplay; encrypted-media" />
            )}
          </div>

          <div className="flex items-center gap-3 px-4 py-2 border-t border-white/10 bg-black/50 backdrop-blur shrink-0">
            <button
              onClick={toggleMute}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                muted ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-[#4CAF50]/20 text-[#4CAF50] hover:bg-[#4CAF50]/30"
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                {muted && <line x1="2" y1="2" x2="22" y2="22" />}
              </svg>
              {muted ? "Mic Off" : "Mic On"}
            </button>
            {micError && <span className="text-red-400 text-xs">{micError}</span>}
            <div className="flex items-center gap-1 ml-auto">
              {members.map((m) => (
                <div
                  key={m.name}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    m.isHost ? "bg-[#4CAF50] text-white" : "bg-white/10 text-gray-400"
                  }`}
                  title={m.name + (m.name === userName ? " (you)" : "")}
                >
                  {m.name[0].toUpperCase()}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-72 border-l border-white/10 flex flex-col bg-black/30 shrink-0">
          {/* Members */}
          <div className="px-3 py-2.5 border-b border-white/10">
            <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Members ({members.length})</h3>
            <div className="flex flex-wrap gap-1">
              {members.map((m) => (
                <div
                  key={m.name}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${m.isHost ? "bg-[#4CAF50]/20 text-[#4CAF50]" : "bg-white/5 text-gray-400"}`}
                  title={m.name}
                >
                  <span className="font-medium truncate max-w-[80px]">{m.name}</span>
                  {m.name === userName && <span className="text-[9px] opacity-60">(you)</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Chat */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 scrollbar-thin">
              {chatMessages.length === 0 && (
                <p className="text-center text-gray-600 text-xs mt-8">No messages yet</p>
              )}
              {chatMessages.map((m) => (
                <div key={m.id} className="group">
                  <div className={`inline-block max-w-full rounded-lg px-2.5 py-1.5 text-sm break-words ${
                    m.from === userName ? "bg-[#4CAF50]/20 text-gray-200 ml-auto" : "bg-white/5 text-gray-300"
                  }`}>
                    <span className={`text-[10px] font-semibold block ${m.from === userName ? "text-[#4CAF50]" : "text-gray-500"}`}>{m.from}</span>
                    {m.text}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Emojis */}
            <div className="flex items-center gap-0.5 px-3 py-1.5 border-t border-white/5">
              {QUICK_EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => sendEmoji(e)}
                  className="flex-1 text-center text-lg py-1 rounded hover:bg-white/10 transition-colors active:scale-110"
                >
                  {e}
                </button>
              ))}
            </div>

            {/* Chat Input */}
            <div className="px-3 py-2 border-t border-white/10">
              <div className="flex gap-1.5">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Message..."
                  className="flex-1 rounded-lg px-3 py-1.5 text-sm bg-white/5 text-white placeholder-gray-600 outline-none border border-white/10 focus:border-[#4CAF50]/50 transition-colors"
                  onKeyDown={(e) => e.key === "Enter" && sendChat()}
                />
                <button onClick={sendChat} className="px-3 py-1.5 rounded-lg text-sm bg-[#4CAF50] text-white hover:bg-[#43A047] transition-colors shrink-0">
                  Send
                </button>
              </div>
            </div>
          </div>

          {/* Share URL */}
          <div className="px-3 py-2.5 border-t border-white/10">
            <div className="flex gap-1.5">
              <input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Paste URL..."
                className="flex-1 rounded-lg px-3 py-1.5 text-sm bg-white/5 text-white placeholder-gray-600 outline-none border border-white/10 focus:border-[#4CAF50]/50 transition-colors"
                onKeyDown={(e) => e.key === "Enter" && shareUrl()}
              />
              <button onClick={shareUrl} className="px-3 py-1.5 rounded-lg text-sm bg-[#4CAF50] text-white hover:bg-[#43A047] transition-colors shrink-0">
                Share
              </button>
            </div>
            {contentUrl && (
              <p className="mt-1 text-[10px] text-gray-600 truncate">Playing: {contentUrl}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function YouTubePlayer({ videoId, onReady, onPlay, onPause, onSeek }: {
  videoId: string;
  onReady: (p: YT.Player) => void;
  onPlay: () => void;
  onPause: () => void;
  onSeek: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef({ onReady, onPlay, onPause, onSeek });
  cb.current = { onReady, onPlay, onPause, onSeek };
  const lastT = useRef(0);

  useEffect(() => {
    let player: YT.Player | null = null;
    const divId = "yt-" + Date.now();

    function make() {
      if (!ref.current) return;
      ref.current.innerHTML = `<div id="${divId}"></div>`;
      player = new YT.Player(divId, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: { autoplay: 0, controls: 1, modestbranding: 1, rel: 0, enablejsapi: 1, origin: window.location.origin },
        events: {
          onReady: (e: YT.PlayerEvent) => cb.current.onReady(e.target),
          onStateChange: (e: YT.OnStateChangeEvent) => {
            if (e.data === YT.PlayerState.PLAYING) {
              const t = e.target.getCurrentTime();
              if (Math.abs(t - lastT.current) > 2) cb.current.onSeek();
              lastT.current = t;
              cb.current.onPlay();
            } else if (e.data === YT.PlayerState.PAUSED) {
              lastT.current = e.target.getCurrentTime();
              cb.current.onPause();
            }
          },
        },
      });
    }

    if (window.YT?.Player) { make(); }
    else {
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const s = document.createElement("script");
        s.src = "https://www.youtube.com/iframe_api";
        s.async = true;
        document.head.appendChild(s);
      }
      (window as unknown as Record<string, unknown>).onYouTubeIframeAPIReady = make;
    }
    return () => { try { player?.destroy(); } catch {} };
  }, [videoId]);

  return <div ref={ref} className="w-full h-full" />;
}
