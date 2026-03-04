"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Peer, { DataConnection, MediaConnection } from "peerjs";

interface Member { name: string; peerId: string | null; isHost: boolean; status?: "online" | "connecting" | "offline"; signal?: number }
interface ChatMsg { id: string; from: string; text: string; ts: number; system?: boolean }
interface EmojiBlast { id: string; emoji: string; from: string; x: number }
interface AudioDevice { deviceId: string; label: string }
interface ControlReq { id: string; from: string; action: "play" | "pause" | "fwd10" | "back10"; executeAt: number }

type WireMsg =
  | { type: "play"; time: number }
  | { type: "pause" }
  | { type: "seek"; time: number }
  | { type: "url"; url: string; contentType: string }
  | { type: "sync-check"; time: number }
  | { type: "member-join"; name: string; peerId: string; isHost: boolean }
  | { type: "member-leave"; name: string }
  | { type: "members-sync"; members: Member[] }
  | { type: "chat"; id: string; from: string; text: string; ts: number; system?: boolean }
  | { type: "emoji"; id: string; emoji: string; from: string }
  | { type: "prebuffer-done"; name: string }
  | { type: "countdown"; startAt: number }
  | { type: "control-request"; id: string; from: string; action: "play" | "pause" | "fwd10" | "back10"; executeAt: number }
  | { type: "control-cancel"; id: string }
  | { type: "ping"; ts: number }
  | { type: "pong"; ts: number };

const QUICK_EMOJIS = ["🔥", "😂", "❤️", "👏", "😮", "💀", "🎉", "👀"];

const MEMBER_COLORS = [
  "#4CAF50", "#2196F3", "#FF9800", "#E91E63", "#9C27B0",
  "#00BCD4", "#FF5722", "#8BC34A", "#3F51B5", "#FFC107",
  "#009688", "#FF4081", "#7C4DFF", "#FFAB00",
];

function memberColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return MEMBER_COLORS[Math.abs(h) % MEMBER_COLORS.length];
}

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=)([^&\s]+)/) || url.match(/(?:youtu\.be\/)([^?\s]+)/) || url.match(/(?:youtube\.com\/embed\/)([^?\s]+)/);
  return m ? m[1] : null;
}

function detectContentType(url: string): "youtube" | "video" | "iframe" {
  if (extractYouTubeId(url)) return "youtube";
  if (/\.(mp4|webm|ogg|m3u8)(\?|$)/i.test(url)) return "video";
  return "iframe";
}

function uid() { return Math.random().toString(36).slice(2, 9); }

function formatTime(ts: number): string {
  const d = new Date(ts);
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function SignalBars({ level }: { level: number }) {
  const color = level >= 3 ? "#4CAF50" : level >= 2 ? "#FFC107" : level >= 1 ? "#FF9800" : "#555";
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16">
      <rect x="1" y="12" width="3" height="4" rx="0.5" fill={level >= 1 ? color : "#333"} />
      <rect x="5.5" y="8" width="3" height="8" rx="0.5" fill={level >= 2 ? color : "#333"} />
      <rect x="10" y="4" width="3" height="12" rx="0.5" fill={level >= 3 ? color : "#333"} />
    </svg>
  );
}

function StatusDot({ status }: { status: string }) {
  const cls = status === "online" ? "bg-[#4CAF50]" : status === "connecting" ? "bg-yellow-500 animate-pulse" : "bg-red-500";
  return <div className={`w-2 h-2 rounded-full shrink-0 ${cls}`} />;
}

export default function WatchPartyRoom({ code }: { code: string }) {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-[#0a0a0a] text-gray-500">Loading room...</div>}>
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

  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [showAudioSettings, setShowAudioSettings] = useState(false);

  const [syncPhase, setSyncPhase] = useState<"idle" | "prebuffer" | "countdown" | "synced">("idle");
  const [countdown, setCountdown] = useState(0);
  const [readyNames, setReadyNames] = useState<Set<string>>(new Set());
  const [activeReq, setActiveReq] = useState<ControlReq | null>(null);
  const [reqCountdown, setReqCountdown] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const peerRef = useRef<Peer | null>(null);
  const dataConns = useRef<Map<string, DataConnection>>(new Map());
  const mediaConns = useRef<Map<string, MediaConnection>>(new Map());
  const localStream = useRef<MediaStream | null>(null);
  const ytPlayer = useRef<YT.Player | null>(null);
  const videoEl = useRef<HTMLVideoElement | null>(null);
  const ignoring = useRef(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const membersRef = useRef<Member[]>([]);
  const seenIds = useRef(new Set<string>());
  const selectedDeviceRef = useRef("");
  const prebufferTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqAnimRef = useRef<number | null>(null);
  const peerStats = useRef<Map<string, { rtt: number; lastSeen: number }>>(new Map());

  const stateRef = useRef({ contentUrl: null as string | null, contentType: null as string | null, isHost });
  stateRef.current = { contentUrl, contentType, isHost };

  useEffect(() => {
    (async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const outputs = devices.filter((d) => d.kind === "audiooutput" && d.deviceId);
        setAudioDevices(outputs.map((d) => ({ deviceId: d.deviceId, label: d.label || `Speaker ${d.deviceId.slice(0, 6)}` })));
      } catch { /* no permission */ }
    })();
  }, []);

  function applyAudioDevice(deviceId: string) {
    selectedDeviceRef.current = deviceId;
    document.querySelectorAll<HTMLAudioElement>("audio[id^='audio-']").forEach((el) => {
      if ("setSinkId" in el) {
        (el as HTMLAudioElement & { setSinkId: (id: string) => Promise<void> }).setSinkId(deviceId).catch(() => {});
      }
    });
  }

  function getCurrentTime(): number {
    if (stateRef.current.contentType === "youtube" && ytPlayer.current) return ytPlayer.current.getCurrentTime?.() || 0;
    if (videoEl.current) return videoEl.current.currentTime;
    return 0;
  }

  function broadcast(msg: WireMsg) {
    dataConns.current.forEach((c) => { if (c.open) c.send(msg); });
  }

  function updateMembers(fn: (prev: Member[]) => Member[]) {
    setMembers((prev) => { const next = fn(prev); membersRef.current = next; return next; });
  }

  function addChat(msg: ChatMsg) {
    if (seenIds.current.has(msg.id)) return;
    seenIds.current.add(msg.id);
    setChatMessages((prev) => [...prev.slice(-100), msg]);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  function spawnEmoji(b: EmojiBlast) {
    if (seenIds.current.has(b.id)) return;
    seenIds.current.add(b.id);
    setEmojiBlasts((prev) => [...prev, b]);
    setTimeout(() => setEmojiBlasts((prev) => prev.filter((e) => e.id !== b.id)), 2500);
  }

  const ACTION_LABELS: Record<string, string> = { play: "play", pause: "pause", fwd10: "skip forward", back10: "skip back" };

  function systemChat(text: string) {
    const msg: ChatMsg = { id: uid(), from: "System", text, ts: Date.now(), system: true };
    addChat(msg);
    broadcast({ type: "chat", ...msg });
  }

  function executeControlAction(action: string) {
    const ct = stateRef.current.contentType;
    ignoring.current = true;
    if (action === "pause") {
      if (ct === "youtube" && ytPlayer.current) ytPlayer.current.pauseVideo();
      else if (videoEl.current) videoEl.current.pause();
      broadcast({ type: "pause" });
    } else if (action === "play") {
      const t = getCurrentTime();
      if (ct === "youtube" && ytPlayer.current) ytPlayer.current.playVideo();
      else if (videoEl.current) videoEl.current.play();
      broadcast({ type: "play", time: t });
    } else if (action === "fwd10") {
      const t = getCurrentTime() + 10;
      if (ct === "youtube" && ytPlayer.current) ytPlayer.current.seekTo(t, true);
      else if (videoEl.current) videoEl.current.currentTime = t;
      broadcast({ type: "seek", time: t });
    } else if (action === "back10") {
      const t = Math.max(0, getCurrentTime() - 10);
      if (ct === "youtube" && ytPlayer.current) ytPlayer.current.seekTo(t, true);
      else if (videoEl.current) videoEl.current.currentTime = t;
      broadcast({ type: "seek", time: t });
    }
    setTimeout(() => { ignoring.current = false; }, 300);
  }

  function handleControlRequest(req: ControlReq) {
    if (seenIds.current.has(req.id)) return;
    seenIds.current.add(req.id);
    setActiveReq(req);
    const tick = () => {
      const left = Math.max(0, (req.executeAt - Date.now()) / 1000);
      setReqCountdown(Math.ceil(left));
      if (left > 0) { reqAnimRef.current = requestAnimationFrame(tick); }
      else {
        setActiveReq(null);
        setReqCountdown(0);
        reqAnimRef.current = null;
        if (stateRef.current.isHost) {
          executeControlAction(req.action);
          systemChat(`${req.from} ${ACTION_LABELS[req.action] || req.action}ed the show`);
        }
      }
    };
    tick();
  }

  function cancelControlRequest(id: string) {
    if (reqAnimRef.current) cancelAnimationFrame(reqAnimRef.current);
    if (reqTimerRef.current) clearTimeout(reqTimerRef.current);
    setActiveReq(null);
    setReqCountdown(0);
    broadcast({ type: "control-cancel", id });
  }

  function requestControl(action: "play" | "pause" | "fwd10" | "back10") {
    if (activeReq) return;
    const req: ControlReq = { id: uid(), from: userName, action, executeAt: Date.now() + 4000 };
    broadcast({ type: "control-request", ...req });
    handleControlRequest(req);
  }

  function startPrebuffer() {
    setSyncPhase("prebuffer");
    setReadyNames(new Set());
    ignoring.current = true;
    const ct = stateRef.current.contentType;
    if (ct === "youtube" && ytPlayer.current) {
      ytPlayer.current.mute();
      ytPlayer.current.seekTo(0, true);
      ytPlayer.current.playVideo();
    } else if (videoEl.current) {
      videoEl.current.muted = true;
      videoEl.current.currentTime = 0;
      videoEl.current.play();
    }
    prebufferTimerRef.current = setTimeout(() => finishPrebuffer(), 15000);
  }

  function finishPrebuffer() {
    if (prebufferTimerRef.current) { clearTimeout(prebufferTimerRef.current); prebufferTimerRef.current = null; }
    const ct = stateRef.current.contentType;
    if (ct === "youtube" && ytPlayer.current) { ytPlayer.current.pauseVideo(); ytPlayer.current.seekTo(0, true); }
    else if (videoEl.current) { videoEl.current.pause(); videoEl.current.currentTime = 0; }
    broadcast({ type: "prebuffer-done", name: userName });
    setReadyNames((prev) => new Set(prev).add(userName));
    if (stateRef.current.isHost) checkAllReady();
  }

  function checkAllReady() {
    setReadyNames((prev) => {
      const total = membersRef.current.length;
      if (prev.size >= total && total > 0) {
        const startAt = Date.now() + 3500;
        broadcast({ type: "countdown", startAt });
        runCountdown(startAt);
      }
      return prev;
    });
  }

  function runCountdown(startAt: number) {
    setSyncPhase("countdown");
    const tick = () => {
      const left = Math.max(0, Math.ceil((startAt - Date.now()) / 1000));
      setCountdown(left);
      if (left > 0) { requestAnimationFrame(tick); }
      else {
        setSyncPhase("synced");
        ignoring.current = false;
        const ct = stateRef.current.contentType;
        if (ct === "youtube" && ytPlayer.current) {
          ytPlayer.current.unMute();
          ytPlayer.current.seekTo(0, true);
          ytPlayer.current.playVideo();
        } else if (videoEl.current) {
          videoEl.current.muted = false;
          videoEl.current.currentTime = 0;
          videoEl.current.play();
        }
      }
    };
    tick();
  }

  function applySync(msg: WireMsg) {
    const ct = stateRef.current.contentType;
    switch (msg.type) {
      case "play":
        ignoring.current = true;
        if (ct === "youtube" && ytPlayer.current) { ytPlayer.current.seekTo(msg.time, true); ytPlayer.current.playVideo(); }
        else if (videoEl.current) { videoEl.current.currentTime = msg.time; videoEl.current.play(); }
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
        setTimeout(() => startPrebuffer(), 500);
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
          addChat({ id: uid(), from: "system", text: `${msg.name} joined the party`, ts: Date.now(), system: true });
          return [...prev, { name: msg.name, peerId: msg.peerId, isHost: msg.isHost, status: "connecting", signal: 0 }];
        });
        break;
      case "member-leave":
        updateMembers((prev) => prev.filter((m) => m.name !== msg.name));
        addChat({ id: uid(), from: "system", text: `${msg.name} left the party`, ts: Date.now(), system: true });
        break;
      case "members-sync":
        updateMembers((prev) => {
          const merged = new Map<string, Member>();
          prev.forEach((m) => merged.set(m.name, m));
          msg.members.forEach((m) => {
            const existing = merged.get(m.name);
            if (existing) {
              merged.set(m.name, { ...existing, peerId: m.peerId || existing.peerId, isHost: m.isHost || existing.isHost });
            } else {
              merged.set(m.name, { ...m, status: m.status || "connecting", signal: m.signal ?? 0 });
            }
          });
          return Array.from(merged.values());
        });
        break;
      case "chat":
        addChat({ id: msg.id, from: msg.from, text: msg.text, ts: msg.ts, system: msg.system });
        break;
      case "emoji":
        spawnEmoji({ id: msg.id, emoji: msg.emoji, from: msg.from, x: 10 + Math.random() * 80 });
        break;
      case "prebuffer-done":
        setReadyNames((prev) => { const n = new Set(prev); n.add(msg.name); return n; });
        if (stateRef.current.isHost) setTimeout(() => checkAllReady(), 100);
        break;
      case "countdown":
        runCountdown(msg.startAt);
        break;
      case "control-request":
        handleControlRequest({ id: msg.id, from: msg.from, action: msg.action, executeAt: msg.executeAt });
        break;
      case "control-cancel":
        if (reqAnimRef.current) cancelAnimationFrame(reqAnimRef.current);
        setActiveReq(null);
        setReqCountdown(0);
        break;
    }
  }

  function wireData(conn: DataConnection) {
    conn.on("data", (raw) => {
      const msg = raw as WireMsg;
      if (msg.type === "ping") { conn.send({ type: "pong", ts: msg.ts }); return; }
      if (msg.type === "pong") {
        const rtt = Date.now() - msg.ts;
        peerStats.current.set(conn.peer, { rtt, lastSeen: Date.now() });
        const signal = rtt < 100 ? 3 : rtt < 250 ? 2 : rtt < 500 ? 1 : 0;
        updateMembers((prev) => prev.map((m) => m.peerId === conn.peer ? { ...m, signal, status: "online" } : m));
        return;
      }
      applySync(msg);
    });
    conn.on("open", () => {
      dataConns.current.set(conn.peer, conn);
      peerStats.current.set(conn.peer, { rtt: 0, lastSeen: Date.now() });
      updateMembers((prev) => prev.map((m) => m.peerId === conn.peer ? { ...m, status: "online", signal: 3 } : m));
      conn.send({ type: "member-join", name: userName, peerId: peerRef.current?.id || "", isHost } as WireMsg);
      conn.send({ type: "members-sync", members: membersRef.current } as WireMsg);
      if (stateRef.current.isHost && stateRef.current.contentUrl) {
        conn.send({ type: "url", url: stateRef.current.contentUrl, contentType: stateRef.current.contentType } as WireMsg);
        setTimeout(() => conn.send({ type: "sync-check", time: getCurrentTime() } as WireMsg), 1500);
      }
    });
    conn.on("close", () => {
      dataConns.current.delete(conn.peer);
      peerStats.current.delete(conn.peer);
      updateMembers((prev) => prev.map((m) => m.peerId === conn.peer ? { ...m, status: "offline", signal: 0 } : m));
    });
  }

  function playRemoteStream(peerId: string, stream: MediaStream) {
    const old = document.getElementById(`audio-${peerId}`) as HTMLAudioElement | null;
    if (old) old.remove();
    const el = document.createElement("audio");
    el.id = `audio-${peerId}`;
    el.srcObject = stream;
    el.autoplay = true;
    el.setAttribute("playsinline", "true");
    el.setAttribute("webkit-playsinline", "true");
    el.volume = 1;
    el.style.cssText = "position:absolute;left:-9999px;";
    if (selectedDeviceRef.current && "setSinkId" in el) {
      (el as HTMLAudioElement & { setSinkId: (id: string) => Promise<void> }).setSinkId(selectedDeviceRef.current).catch(() => {});
    }
    document.body.appendChild(el);
    const tryPlay = () => {
      el.play().catch(() => {
        const resume = () => { el.play().catch(() => {}); document.removeEventListener("click", resume); document.removeEventListener("touchstart", resume); };
        document.addEventListener("click", resume, { once: true });
        document.addEventListener("touchstart", resume, { once: true });
      });
    };
    tryPlay();
    setTimeout(tryPlay, 300);
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
      updateMembers((prev) => prev.find((m) => m.name === userName) ? prev : [...prev, { name: userName, peerId: null, isHost, status: "connecting", signal: 0 }]);

      fetch("/api/watch-party/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name: userName }),
      }).catch(() => {});

      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
        s.getAudioTracks().forEach((t) => (t.enabled = false));
        localStream.current = s;
      } catch {
        try {
          const s = await navigator.mediaDevices.getUserMedia({ audio: true });
          s.getAudioTracks().forEach((t) => (t.enabled = false));
          localStream.current = s;
        } catch { setMicError("Mic access denied"); }
      }

      const peer = new Peer({
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" },
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
        updateMembers((prev) => prev.map((m) => m.name === userName ? { ...m, peerId: myId, status: "online", signal: 3 } : m));
        fetch(`/api/watch-party/${code}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ peerId: myId, memberName: userName }) });
        const res = await fetch(`/api/watch-party/${code}`);
        const d = await res.json();
        if (d.room) {
          updateMembers((prev) => {
            const merged = new Map<string, Member>();
            prev.forEach((m) => merged.set(m.name, m));
            (d.room.members as Member[]).forEach((m) => {
              const existing = merged.get(m.name);
              if (existing) {
                merged.set(m.name, { ...existing, peerId: m.peerId || existing.peerId, isHost: m.isHost || existing.isHost });
              } else {
                merged.set(m.name, { ...m, status: "connecting", signal: 0 });
              }
            });
            return Array.from(merged.values());
          });
          if (d.room.contentUrl) {
            setContentUrl(d.room.contentUrl);
            setContentType(d.room.contentType || detectContentType(d.room.contentUrl));
          }
          d.room.members.forEach((m: Member) => { if (m.peerId && m.peerId !== myId) dialPeer(m.peerId); });
        }
        broadcast({ type: "member-join", name: userName, peerId: myId, isHost });
      });

      peer.on("connection", (c) => wireData(c));
      peer.on("call", (call) => {
        const stream = localStream.current || new MediaStream();
        call.answer(stream);
        call.on("stream", (s) => playRemoteStream(call.peer, s));
        mediaConns.current.set(call.peer, call);
        if (!localStream.current) {
          const checkStream = setInterval(() => {
            if (localStream.current) {
              clearInterval(checkStream);
              const mc = peer.call(call.peer, localStream.current);
              mc.on("stream", (s) => playRemoteStream(call.peer, s));
              mediaConns.current.set(call.peer, mc);
            }
          }, 500);
          setTimeout(() => clearInterval(checkStream), 10000);
        }
      });
      peer.on("error", (e) => console.error("Peer:", e.type, e));
    })();

    const poll = setInterval(async () => {
      if (dead) return;
      try {
        const r = await fetch(`/api/watch-party/${code}`);
        const d = await r.json();
        if (d.room) {
          updateMembers((prev) => {
            const merged = new Map<string, Member>();
            prev.forEach((m) => merged.set(m.name, m));
            (d.room.members as Member[]).forEach((m) => {
              const existing = merged.get(m.name);
              merged.set(m.name, { ...m, peerId: m.peerId || existing?.peerId || null, status: existing?.status || "connecting", signal: existing?.signal ?? 0 });
            });
            return Array.from(merged.values());
          });
          const myId = peerRef.current?.id;
          if (myId) d.room.members.forEach((m: Member) => { if (m.peerId && m.peerId !== myId && !dataConns.current.has(m.peerId)) dialPeer(m.peerId); });
        }
      } catch {}
    }, 3000);

    return () => {
      dead = true;
      clearInterval(poll);
      if (prebufferTimerRef.current) clearTimeout(prebufferTimerRef.current);
      if (reqAnimRef.current) cancelAnimationFrame(reqAnimRef.current);
      if (reqTimerRef.current) clearTimeout(reqTimerRef.current);
      broadcast({ type: "member-leave", name: userName });
      dataConns.current.forEach((c) => c.close());
      mediaConns.current.forEach((c) => c.close());
      localStream.current?.getTracks().forEach((t) => t.stop());
      document.querySelectorAll("audio[id^='audio-']").forEach((el) => el.remove());
      peerRef.current?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, userName]);

  useEffect(() => {
    if (!isHost || !contentUrl) return;
    const id = setInterval(() => broadcast({ type: "sync-check", time: getCurrentTime() }), 3000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, contentUrl]);

  useEffect(() => {
    const id = setInterval(() => {
      dataConns.current.forEach((c) => { if (c.open) c.send({ type: "ping", ts: Date.now() }); });
      const now = Date.now();
      peerStats.current.forEach((stats, peerId) => {
        if (now - stats.lastSeen > 15000) {
          updateMembers((prev) => prev.map((m) => m.peerId === peerId ? { ...m, status: "offline", signal: 0 } : m));
        }
      });
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const emitPlay = () => { if (!ignoring.current && isHost) broadcast({ type: "play", time: getCurrentTime() }); };
  const emitPause = () => { if (!ignoring.current && isHost) broadcast({ type: "pause" }); };
  const emitSeek = () => { if (!ignoring.current && isHost) broadcast({ type: "seek", time: getCurrentTime() }); };

  const toggleMute = () => {
    const track = localStream.current?.getAudioTracks()[0];
    if (!track) return;
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
    setTimeout(() => startPrebuffer(), 500);
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
    const b: EmojiBlast = { id: uid(), emoji, from: userName, x: 10 + Math.random() * 80 };
    spawnEmoji(b);
    broadcast({ type: "emoji", id: b.id, emoji, from: userName });
  };

  const copyCode = () => { navigator.clipboard.writeText(code); setCopiedWhat("code"); setTimeout(() => setCopiedWhat(""), 2000); };
  const copyLink = () => { navigator.clipboard.writeText(`${window.location.origin}/watch-party?join=${code}`); setCopiedWhat("link"); setTimeout(() => setCopiedWhat(""), 2000); };

  const leaveRoom = () => {
    broadcast({ type: "member-leave", name: userName });
    router.push("/watch-party");
    fetch(`/api/watch-party/${code}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ removeMember: userName }) });
  };

  const changeDevice = (deviceId: string) => {
    setSelectedDevice(deviceId);
    applyAudioDevice(deviceId);
    setShowAudioSettings(false);
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-[#0a0a0a] text-white overflow-hidden relative">
      {emojiBlasts.map((b) => (
        <div key={b.id} className="fixed pointer-events-none z-50 animate-emoji-rise" style={{ left: `${b.x}%`, bottom: "10%" }}>
          <div className="flex flex-col items-center">
            <span className="text-5xl drop-shadow-lg">{b.emoji}</span>
            <span className="text-[10px] text-white/70 mt-1 bg-black/40 px-1.5 py-0.5 rounded">{b.from}</span>
          </div>
        </div>
      ))}

      {(syncPhase === "prebuffer" || syncPhase === "countdown") && (
        <div className="fixed inset-0 z-40 bg-black/90 flex items-center justify-center">
          <div className="text-center">
            {syncPhase === "prebuffer" && (
              <>
                <div className="w-12 h-12 border-4 border-[#4CAF50] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-xl font-semibold mb-2">Buffering...</p>
                <p className="text-gray-400 text-sm mb-4">Pre-loading content for sync (15s)</p>
                <div className="flex flex-wrap justify-center gap-2 mb-4">
                  {members.map((m) => (
                    <span key={m.name} className={`text-xs px-2.5 py-1 rounded-full ${readyNames.has(m.name) ? "bg-[#4CAF50]/20 text-[#4CAF50]" : "bg-white/5 text-gray-500"}`}>
                      {readyNames.has(m.name) ? "Ready" : "Loading"} - {m.name}
                    </span>
                  ))}
                </div>
                {isHost && (
                  <button onClick={() => finishPrebuffer()} className="mt-2 px-6 py-2 rounded-xl text-sm font-medium bg-white/10 text-white hover:bg-white/20 transition-colors border border-white/10">
                    Skip Buffer
                  </button>
                )}
              </>
            )}
            {syncPhase === "countdown" && (
              <>
                <div className="text-8xl font-bold text-[#4CAF50] mb-4 tabular-nums" style={{ textShadow: "0 0 40px rgba(76,175,80,0.4)" }}>
                  {countdown}
                </div>
                <p className="text-lg text-gray-300">Starting in...</p>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes emoji-rise { 0%{opacity:1;transform:translateY(0) scale(1)} 50%{opacity:1;transform:translateY(-120px) scale(1.3)} 100%{opacity:0;transform:translateY(-260px) scale(.8)} }
        .animate-emoji-rise{animation:emoji-rise 2.5s ease-out forwards}
        @keyframes req-bar { from{width:100%} to{width:0%} }
      `}</style>

      {/* Control Request Banner */}
      {activeReq && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 w-auto">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl px-5 py-3 shadow-2xl flex items-center gap-3 min-w-[280px]">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: memberColor(activeReq.from) + "33", color: memberColor(activeReq.from) }}>
              {activeReq.from[0].toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-sm text-white"><span className="font-semibold" style={{ color: memberColor(activeReq.from) }}>{activeReq.from}</span> wants to {ACTION_LABELS[activeReq.action]}</p>
              <div className="mt-1.5 h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-[#FF9800] rounded-full" style={{ animation: "req-bar 4s linear forwards" }} />
              </div>
            </div>
            <span className="text-lg font-bold text-[#FF9800] tabular-nums w-6 text-center">{reqCountdown}</span>
            {isHost && (
              <button onClick={() => cancelControlRequest(activeReq.id)} className="text-xs px-2 py-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">Cancel</button>
            )}
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-white/10 bg-black/50 shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto">
          <div className={`w-2 h-2 rounded-full shrink-0 ${connected ? "bg-[#4CAF50]" : "bg-red-500"}`} />
          <span className="font-mono text-sm sm:text-lg tracking-wider shrink-0">{code}</span>
          <button onClick={copyCode} className="text-[10px] sm:text-xs px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors shrink-0">{copiedWhat === "code" ? "Copied!" : "Copy Code"}</button>
          <button onClick={copyLink} className="text-[10px] sm:text-xs px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors shrink-0">{copiedWhat === "link" ? "Copied!" : "Copy Link"}</button>
          {isHost && <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded bg-[#4CAF50]/20 text-[#4CAF50] shrink-0">Host</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden text-sm p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          </button>
          <button onClick={leaveRoom} className="text-xs sm:text-sm px-3 sm:px-4 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">Leave</button>
        </div>
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
              <YouTubePlayer videoId={extractYouTubeId(contentUrl) || ""} onReady={(p) => { ytPlayer.current = p; }} onPlay={emitPlay} onPause={emitPause} onSeek={emitSeek} hostControls={isHost} />
            )}
            {contentUrl && contentType === "video" && (
              <video ref={videoEl} src={contentUrl} className="w-full h-full" controls={isHost} onPlay={emitPlay} onPause={emitPause} onSeeked={emitSeek} />
            )}
            {contentUrl && contentType === "iframe" && (
              <iframe src={contentUrl} className="w-full h-full border-0" allowFullScreen allow="autoplay; encrypted-media" />
            )}
          </div>

          {/* Member Controls (non-host) */}
          {!isHost && contentUrl && contentType !== "iframe" && (
            <div className="flex items-center justify-center gap-2 px-4 py-2 border-t border-white/5 bg-black/30 shrink-0">
              <button onClick={() => requestControl("back10")} disabled={!!activeReq} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-gray-300 hover:bg-white/10 transition-colors disabled:opacity-30">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="12.5 10 3 10 3 1.5"/><path d="M3 10a9 9 0 1 0 3-6.7"/></svg>
                -10s
              </button>
              <button onClick={() => requestControl("pause")} disabled={!!activeReq} className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-gray-300 hover:bg-white/10 transition-colors disabled:opacity-30">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                Pause
              </button>
              <button onClick={() => requestControl("play")} disabled={!!activeReq} className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-gray-300 hover:bg-white/10 transition-colors disabled:opacity-30">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Play
              </button>
              <button onClick={() => requestControl("fwd10")} disabled={!!activeReq} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-gray-300 hover:bg-white/10 transition-colors disabled:opacity-30">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="11.5 10 21 10 21 1.5"/><path d="M21 10a9 9 0 1 1-3-6.7"/></svg>
                +10s
              </button>
            </div>
          )}

          {/* Voice Bar */}
          <div className="flex items-center gap-2 px-3 sm:px-4 py-2 border-t border-white/10 bg-black/50 shrink-0 flex-wrap">
            <button onClick={toggleMute} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${muted ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-[#4CAF50]/20 text-[#4CAF50] hover:bg-[#4CAF50]/30"}`}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                {muted && <line x1="2" y1="2" x2="22" y2="22" />}
              </svg>
              {muted ? "Mic Off" : "Mic On"}
            </button>

            {/* Audio Output Settings */}
            <div className="relative">
              <button onClick={() => setShowAudioSettings(!showAudioSettings)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors" title="Audio output">
                <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
                </svg>
              </button>
              {showAudioSettings && (
                <div className="absolute bottom-full left-0 mb-2 w-56 rounded-xl bg-[#1a1a1a] border border-white/10 shadow-2xl p-2 z-50">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider px-2 py-1">Audio Output</p>
                  {audioDevices.length === 0 && <p className="text-xs text-gray-500 px-2 py-1">No devices found</p>}
                  {audioDevices.map((d) => (
                    <button
                      key={d.deviceId}
                      onClick={() => changeDevice(d.deviceId)}
                      className={`w-full text-left text-xs px-2 py-1.5 rounded-lg transition-colors truncate ${selectedDevice === d.deviceId ? "bg-[#4CAF50]/20 text-[#4CAF50]" : "text-gray-300 hover:bg-white/5"}`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {micError && <span className="text-red-400 text-xs">{micError}</span>}
            <div className="flex items-center gap-1 ml-auto">
              {members.map((m) => (
                <div key={m.name} className="relative" title={`${m.name}${m.name === userName ? " (you)" : ""} - ${m.status || "connecting"}`}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: memberColor(m.name) + "33", color: memberColor(m.name) }}>
                    {m.name[0].toUpperCase()}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5">
                    <StatusDot status={m.status || (m.peerId ? "online" : "connecting")} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}
        <div className={`${sidebarOpen ? "fixed inset-y-0 right-0 z-40" : "hidden"} lg:static lg:flex w-72 border-l border-white/10 flex flex-col bg-[#0a0a0a] lg:bg-black/30 shrink-0`}>
          <div className="px-3 py-2.5 border-b border-white/10">
            <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Members ({members.length})</h3>
            <div className="flex flex-col gap-1">
              {members.map((m) => (
                <div key={m.name} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs" style={{ backgroundColor: memberColor(m.name) + "1a" }}>
                  <div className="relative shrink-0">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: memberColor(m.name) + "33", color: memberColor(m.name) }}>
                      {m.name[0].toUpperCase()}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5">
                      <StatusDot status={m.status || (m.peerId ? "online" : "connecting")} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium truncate block max-w-[100px]" style={{ color: memberColor(m.name) }}>{m.name}</span>
                    <span className="text-[9px] text-gray-500 capitalize">{m.status || "connecting"}</span>
                  </div>
                  {m.name === userName && <span className="text-[9px] text-gray-500">(you)</span>}
                  <SignalBars level={m.signal ?? (m.name === userName ? 3 : 0)} />
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
              {chatMessages.length === 0 && <p className="text-center text-gray-600 text-xs mt-8">No messages yet</p>}
              {chatMessages.map((m) => (
                <div key={m.id}>
                  {m.system ? (
                    <div className="text-center">
                      <span className="text-[10px] text-gray-500 bg-white/[0.03] px-2.5 py-0.5 rounded-full">{m.text}</span>
                    </div>
                  ) : (
                    <div className={`inline-block max-w-full rounded-lg px-2.5 py-1.5 text-sm break-words ${m.from === userName ? "bg-white/5 ml-auto" : "bg-white/[0.03]"}`}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold" style={{ color: memberColor(m.from) }}>{m.from}</span>
                        <span className="text-[9px] text-gray-600">{formatTime(m.ts)}</span>
                      </div>
                      <span className="text-gray-200">{m.text}</span>
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="flex items-center gap-0.5 px-3 py-1.5 border-t border-white/5">
              {QUICK_EMOJIS.map((e) => (
                <button key={e} onClick={() => sendEmoji(e)} className="flex-1 text-center text-lg py-1 rounded hover:bg-white/10 transition-colors active:scale-110">{e}</button>
              ))}
            </div>

            <div className="px-3 py-2 border-t border-white/10">
              <div className="flex gap-1.5 items-end">
                <textarea
                  value={chatInput}
                  onChange={(e) => {
                    setChatInput(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 96) + "px";
                  }}
                  placeholder="Message..."
                  rows={1}
                  className="flex-1 rounded-lg px-3 py-1.5 text-sm bg-white/5 text-white placeholder-gray-600 outline-none border border-white/10 focus:border-[#4CAF50]/50 transition-colors resize-none overflow-y-auto"
                  style={{ maxHeight: 96 }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendChat();
                      const t = e.target as HTMLTextAreaElement;
                      t.style.height = "auto";
                    }
                  }}
                />
                <button onClick={() => { sendChat(); const el = document.querySelector<HTMLTextAreaElement>("textarea[placeholder='Message...']"); if (el) el.style.height = "auto"; }} className="px-3 py-1.5 rounded-lg text-sm bg-[#4CAF50] text-white hover:bg-[#43A047] transition-colors shrink-0">Send</button>
              </div>
            </div>
          </div>

          <div className="px-3 py-2.5 border-t border-white/10">
            <div className="flex gap-1.5">
              <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="Paste URL..." className="flex-1 rounded-lg px-3 py-1.5 text-sm bg-white/5 text-white placeholder-gray-600 outline-none border border-white/10 focus:border-[#4CAF50]/50 transition-colors" onKeyDown={(e) => e.key === "Enter" && shareUrl()} />
              <button onClick={shareUrl} className="px-3 py-1.5 rounded-lg text-sm bg-[#4CAF50] text-white hover:bg-[#43A047] transition-colors shrink-0">Share</button>
            </div>
            {contentUrl && <p className="mt-1 text-[10px] text-gray-600 truncate">Playing: {contentUrl}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function YouTubePlayer({ videoId, onReady, onPlay, onPause, onSeek, hostControls }: { videoId: string; onReady: (p: YT.Player) => void; onPlay: () => void; onPause: () => void; onSeek: () => void; hostControls: boolean }) {
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
        videoId, width: "100%", height: "100%",
        playerVars: { autoplay: 0, controls: hostControls ? 1 : 0, modestbranding: 1, rel: 0, enablejsapi: 1, origin: window.location.origin },
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
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) { const s = document.createElement("script"); s.src = "https://www.youtube.com/iframe_api"; s.async = true; document.head.appendChild(s); }
      (window as unknown as Record<string, unknown>).onYouTubeIframeAPIReady = make;
    }
    return () => { try { player?.destroy(); } catch {} };
  }, [videoId, hostControls]);

  return <div ref={ref} className="w-full h-full" />;
}
