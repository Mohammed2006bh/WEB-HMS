"use client";

import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Peer, { DataConnection, MediaConnection } from "peerjs";

interface Member {
  name: string;
  peerId: string | null;
  isHost: boolean;
}

interface RoomData {
  code: string;
  hostName: string;
  hostPeerId: string | null;
  contentUrl: string | null;
  contentType: string | null;
  members: Member[];
}

interface SyncMessage {
  type: "play" | "pause" | "seek" | "url" | "sync-check" | "request-sync";
  time?: number;
  url?: string;
  contentType?: string;
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\s]+)/,
    /(?:youtu\.be\/)([^?\s]+)/,
    /(?:youtube\.com\/embed\/)([^?\s]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function detectContentType(url: string): "youtube" | "video" | "iframe" {
  if (extractYouTubeId(url)) return "youtube";
  if (/\.(mp4|webm|ogg|m3u8)(\?|$)/i.test(url)) return "video";
  return "iframe";
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
      <WatchPartyRoomInner code={code} />
    </Suspense>
  );
}

function WatchPartyRoomInner({ code }: { code: string }) {
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
  const [error, setError] = useState("");
  const [speakingPeers, setSpeakingPeers] = useState<Set<string>>(new Set());

  const peerRef = useRef<Peer | null>(null);
  const connectionsRef = useRef<Map<string, DataConnection>>(new Map());
  const mediaConnectionsRef = useRef<Map<string, MediaConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const ytPlayerRef = useRef<YT.Player | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ignoreEventsRef = useRef(false);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextsRef = useRef<Map<string, { ctx: AudioContext; analyser: AnalyserNode }>>(new Map());

  const broadcastMessage = useCallback((msg: SyncMessage) => {
    connectionsRef.current.forEach((conn) => {
      if (conn.open) conn.send(msg);
    });
  }, []);

  const getCurrentTime = useCallback((): number => {
    if (contentType === "youtube" && ytPlayerRef.current) {
      return ytPlayerRef.current.getCurrentTime?.() || 0;
    }
    if (videoRef.current) return videoRef.current.currentTime;
    return 0;
  }, [contentType]);

  const seekTo = useCallback(
    (time: number) => {
      ignoreEventsRef.current = true;
      if (contentType === "youtube" && ytPlayerRef.current) {
        ytPlayerRef.current.seekTo(time, true);
      } else if (videoRef.current) {
        videoRef.current.currentTime = time;
      }
      setTimeout(() => {
        ignoreEventsRef.current = false;
      }, 500);
    },
    [contentType]
  );

  const playContent = useCallback(() => {
    ignoreEventsRef.current = true;
    if (contentType === "youtube" && ytPlayerRef.current) {
      ytPlayerRef.current.playVideo();
    } else if (videoRef.current) {
      videoRef.current.play();
    }
    setTimeout(() => {
      ignoreEventsRef.current = false;
    }, 500);
  }, [contentType]);

  const pauseContent = useCallback(() => {
    ignoreEventsRef.current = true;
    if (contentType === "youtube" && ytPlayerRef.current) {
      ytPlayerRef.current.pauseVideo();
    } else if (videoRef.current) {
      videoRef.current.pause();
    }
    setTimeout(() => {
      ignoreEventsRef.current = false;
    }, 500);
  }, [contentType]);

  const handleSyncMessage = useCallback(
    (msg: SyncMessage) => {
      switch (msg.type) {
        case "play":
          if (msg.time !== undefined) seekTo(msg.time);
          playContent();
          break;
        case "pause":
          pauseContent();
          break;
        case "seek":
          if (msg.time !== undefined) seekTo(msg.time);
          break;
        case "url":
          if (msg.url) {
            setContentUrl(msg.url);
            setContentType(msg.contentType || detectContentType(msg.url));
          }
          break;
        case "sync-check":
          if (!isHost && msg.time !== undefined) {
            const diff = Math.abs(getCurrentTime() - msg.time);
            if (diff > 1.5) seekTo(msg.time);
          }
          break;
        case "request-sync":
          if (isHost) {
            broadcastMessage({
              type: "sync-check",
              time: getCurrentTime(),
            });
          }
          break;
      }
    },
    [seekTo, playContent, pauseContent, isHost, getCurrentTime, broadcastMessage]
  );

  const monitorAudio = useCallback((peerId: string, stream: MediaStream) => {
    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioContextsRef.current.set(peerId, { ctx, analyser });

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const check = () => {
        if (!audioContextsRef.current.has(peerId)) return;
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setSpeakingPeers((prev) => {
          const next = new Set(prev);
          if (avg > 15) next.add(peerId);
          else next.delete(peerId);
          return next;
        });
        requestAnimationFrame(check);
      };
      check();
    } catch {
      // AudioContext not supported
    }
  }, []);

  const setupDataConnection = useCallback(
    (conn: DataConnection) => {
      conn.on("data", (data) => {
        handleSyncMessage(data as SyncMessage);
      });
      conn.on("open", () => {
        connectionsRef.current.set(conn.peer, conn);
        if (isHost && contentUrl) {
          conn.send({
            type: "url",
            url: contentUrl,
            contentType: contentType,
          } as SyncMessage);
          setTimeout(() => {
            conn.send({
              type: "sync-check",
              time: getCurrentTime(),
            } as SyncMessage);
          }, 2000);
        }
      });
      conn.on("close", () => {
        connectionsRef.current.delete(conn.peer);
      });
    },
    [handleSyncMessage, isHost, contentUrl, contentType, getCurrentTime]
  );

  const connectToPeer = useCallback(
    (remotePeerId: string) => {
      const peer = peerRef.current;
      if (!peer || connectionsRef.current.has(remotePeerId)) return;

      const conn = peer.connect(remotePeerId, { reliable: true });
      setupDataConnection(conn);

      if (localStreamRef.current) {
        const call = peer.call(remotePeerId, localStreamRef.current);
        call.on("stream", (remoteStream) => {
          playRemoteAudio(remotePeerId, remoteStream);
        });
        mediaConnectionsRef.current.set(remotePeerId, call);
      }
    },
    [setupDataConnection]
  );

  const playRemoteAudio = useCallback((peerId: string, stream: MediaStream) => {
    const existing = document.getElementById(`audio-${peerId}`) as HTMLAudioElement;
    if (existing) existing.remove();

    const audio = document.createElement("audio");
    audio.id = `audio-${peerId}`;
    audio.srcObject = stream;
    audio.autoplay = true;
    audio.setAttribute("playsinline", "true");
    audio.style.display = "none";
    document.body.appendChild(audio);
    audio.play().catch(() => {
      const resumeAudio = () => {
        audio.play().catch(() => {});
        document.removeEventListener("click", resumeAudio);
        document.removeEventListener("touchstart", resumeAudio);
      };
      document.addEventListener("click", resumeAudio);
      document.addEventListener("touchstart", resumeAudio);
    });

    monitorAudio(peerId, stream);
  }, [monitorAudio]);

  useEffect(() => {
    let destroyed = false;

    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        stream.getAudioTracks().forEach((t) => (t.enabled = false));
        localStreamRef.current = stream;
      } catch {
        setError("Microphone access required for voice chat");
      }

      const peer = new Peer({
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" },
            { urls: "stun:stun3.l.google.com:19302" },
            { urls: "stun:stun4.l.google.com:19302" },
            {
              urls: "turn:openrelay.metered.ca:80",
              username: "openrelayproject",
              credential: "openrelayproject",
            },
            {
              urls: "turn:openrelay.metered.ca:443",
              username: "openrelayproject",
              credential: "openrelayproject",
            },
            {
              urls: "turn:openrelay.metered.ca:443?transport=tcp",
              username: "openrelayproject",
              credential: "openrelayproject",
            },
          ],
        },
      });

      peerRef.current = peer;

      peer.on("open", async (peerId) => {
        if (destroyed) return;
        setConnected(true);

        await fetch(`/api/watch-party/${code}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ peerId, memberName: userName }),
        });

        const res = await fetch(`/api/watch-party/${code}`);
        const data = await res.json();
        if (data.room) {
          setMembers(data.room.members);
          if (data.room.contentUrl) {
            setContentUrl(data.room.contentUrl);
            setContentType(data.room.contentType || detectContentType(data.room.contentUrl));
          }

          data.room.members.forEach((m: Member) => {
            if (m.peerId && m.peerId !== peerId) {
              connectToPeer(m.peerId);
            }
          });
        }
      });

      peer.on("connection", (conn) => {
        setupDataConnection(conn);
      });

      peer.on("call", (call) => {
        if (localStreamRef.current) {
          call.answer(localStreamRef.current);
        }
        call.on("stream", (remoteStream) => {
          playRemoteAudio(call.peer, remoteStream);
        });
        mediaConnectionsRef.current.set(call.peer, call);
      });

      peer.on("error", (err) => {
        console.error("PeerJS error:", err);
      });
    }

    init();

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/watch-party/${code}`);
        const data = await res.json();
        if (data.room) {
          setMembers(data.room.members);
          const myPeerId = peerRef.current?.id;
          if (myPeerId) {
            data.room.members.forEach((m: Member) => {
              if (
                m.peerId &&
                m.peerId !== myPeerId &&
                !connectionsRef.current.has(m.peerId)
              ) {
                connectToPeer(m.peerId);
              }
            });
          }
        }
      } catch {
        // polling error
      }
    }, 5000);

    return () => {
      destroyed = true;
      clearInterval(pollInterval);
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
      connectionsRef.current.forEach((c) => c.close());
      mediaConnectionsRef.current.forEach((c) => c.close());
      audioContextsRef.current.forEach(({ ctx }) => ctx.close());
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      document.querySelectorAll("audio[id^='audio-']").forEach((el) => el.remove());
      peerRef.current?.destroy();
    };
  }, [code, userName, connectToPeer, setupDataConnection, playRemoteAudio]);

  useEffect(() => {
    if (!isHost || !contentUrl) return;
    if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    syncIntervalRef.current = setInterval(() => {
      broadcastMessage({ type: "sync-check", time: getCurrentTime() });
    }, 3000);
    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [isHost, contentUrl, broadcastMessage, getCurrentTime]);

  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const track = stream.getAudioTracks()[0];
    if (track) {
      const newMuted = !muted;
      track.enabled = !newMuted;
      setMuted(newMuted);
    }
  };

  const shareUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    const type = detectContentType(url);
    setContentUrl(url);
    setContentType(type);
    setUrlInput("");

    broadcastMessage({ type: "url", url, contentType: type });

    fetch(`/api/watch-party/${code}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentUrl: url, contentType: type }),
    });
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopiedWhat("code");
    setTimeout(() => setCopiedWhat(""), 2000);
  };

  const copyLink = () => {
    const link = `${window.location.origin}/watch-party?join=${code}`;
    navigator.clipboard.writeText(link);
    setCopiedWhat("link");
    setTimeout(() => setCopiedWhat(""), 2000);
  };

  const leaveRoom = async () => {
    await fetch(`/api/watch-party/${code}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ removeMember: userName }),
    });
    router.push("/watch-party");
  };

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a] text-white overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/40 backdrop-blur shrink-0">
        <div className="flex items-center gap-3">
          <div
            className={`w-2 h-2 rounded-full ${connected ? "bg-[#4CAF50]" : "bg-red-500"}`}
          />
          <span className="font-mono text-lg tracking-wider">{code}</span>
          <button
            onClick={copyCode}
            className="text-xs px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            {copiedWhat === "code" ? "Copied!" : "Copy Code"}
          </button>
          <button
            onClick={copyLink}
            className="text-xs px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            {copiedWhat === "link" ? "Copied!" : "Copy Link"}
          </button>
          {isHost && (
            <span className="text-xs px-2 py-0.5 rounded bg-[#4CAF50]/20 text-[#4CAF50]">
              Host
            </span>
          )}
        </div>
        <button
          onClick={leaveRoom}
          className="text-sm px-4 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
        >
          Leave
        </button>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Player Area */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 relative bg-black flex items-center justify-center">
            {!contentUrl && (
              <div className="text-gray-500 text-center">
                <svg
                  className="w-16 h-16 mx-auto mb-4 opacity-30"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p>Share a link to start watching</p>
              </div>
            )}

            {contentUrl && contentType === "youtube" && (
              <>
                <link rel="preconnect" href="https://www.youtube.com" />
                <link rel="preconnect" href="https://i.ytimg.com" />
                <YouTubePlayer
                videoId={extractYouTubeId(contentUrl) || ""}
                onReady={(player) => {
                  ytPlayerRef.current = player;
                }}
                onPlay={() => {
                  if (!ignoreEventsRef.current && isHost) {
                    broadcastMessage({ type: "play", time: getCurrentTime() });
                  }
                }}
                onPause={() => {
                  if (!ignoreEventsRef.current && isHost) {
                    broadcastMessage({ type: "pause" });
                  }
                }}
                onSeek={() => {
                  if (!ignoreEventsRef.current && isHost) {
                    broadcastMessage({ type: "seek", time: getCurrentTime() });
                  }
                }}
              />
              </>
            )}

            {contentUrl && contentType === "video" && (
              <video
                ref={videoRef}
                src={contentUrl}
                className="w-full h-full"
                controls={isHost}
                onPlay={() => {
                  if (!ignoreEventsRef.current && isHost)
                    broadcastMessage({ type: "play", time: getCurrentTime() });
                }}
                onPause={() => {
                  if (!ignoreEventsRef.current && isHost)
                    broadcastMessage({ type: "pause" });
                }}
                onSeeked={() => {
                  if (!ignoreEventsRef.current && isHost)
                    broadcastMessage({ type: "seek", time: getCurrentTime() });
                }}
              />
            )}

            {contentUrl && contentType === "iframe" && (
              <iframe
                src={contentUrl}
                className="w-full h-full border-0"
                allowFullScreen
                allow="autoplay; encrypted-media"
              />
            )}
          </div>

          {/* Voice Bar */}
          <div className="flex items-center gap-4 px-4 py-3 border-t border-white/10 bg-black/40 backdrop-blur shrink-0">
            <button
              onClick={toggleMute}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                muted
                  ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                  : "bg-[#4CAF50]/20 text-[#4CAF50] hover:bg-[#4CAF50]/30"
              }`}
            >
              {muted ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
              {muted ? "Mic Off" : "Mic On"}
            </button>

            {error && <span className="text-red-400 text-xs">{error}</span>}

            <div className="flex gap-1 ml-auto">
              {members
                .filter((m) => m.peerId && m.peerId !== peerRef.current?.id)
                .map((m) => (
                  <div
                    key={m.name}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                      speakingPeers.has(m.peerId!)
                        ? "bg-[#4CAF50] text-white ring-2 ring-[#4CAF50]/50 scale-110"
                        : "bg-white/10 text-gray-400"
                    }`}
                    title={m.name}
                  >
                    {m.name[0].toUpperCase()}
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-72 border-l border-white/10 flex flex-col bg-black/20 shrink-0">
          {/* Members */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Members ({members.length})
            </h3>
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.name} className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      m.isHost ? "bg-[#4CAF50] text-white" : "bg-white/10 text-gray-300"
                    } ${
                      m.peerId && speakingPeers.has(m.peerId)
                        ? "ring-2 ring-[#4CAF50]/50"
                        : ""
                    }`}
                  >
                    {m.name[0].toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-300 truncate">
                    {m.name}
                    {m.name === userName && " (you)"}
                  </span>
                  {m.isHost && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#4CAF50]/20 text-[#4CAF50] ml-auto">
                      Host
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Share URL */}
          <div className="p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Share Content
            </h3>
            <div className="flex flex-col gap-2">
              <input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Paste URL here..."
                className="w-full rounded-lg px-3 py-2 text-sm bg-white/5 text-white placeholder-gray-600 outline-none border border-white/10 focus:border-[#4CAF50]/50 transition-colors"
                onKeyDown={(e) => e.key === "Enter" && shareUrl()}
              />
              <button
                onClick={shareUrl}
                className="w-full py-2 rounded-lg text-sm font-medium bg-[#4CAF50] text-white hover:bg-[#43A047] transition-colors"
              >
                Share
              </button>
            </div>
            {contentUrl && (
              <div className="mt-3 p-2 rounded-lg bg-white/5 border border-white/5">
                <p className="text-xs text-gray-500 mb-1">Now playing:</p>
                <p className="text-xs text-gray-300 truncate">{contentUrl}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function YouTubePlayer({
  videoId,
  onReady,
  onPlay,
  onPause,
  onSeek,
}: {
  videoId: string;
  onReady: (player: YT.Player) => void;
  onPlay: () => void;
  onPause: () => void;
  onSeek: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const lastTimeRef = useRef(0);
  const callbacksRef = useRef({ onReady, onPlay, onPause, onSeek });
  callbacksRef.current = { onReady, onPlay, onPause, onSeek };

  useEffect(() => {
    let player: YT.Player | null = null;

    function createPlayer() {
      if (!containerRef.current) return;
      const div = document.createElement("div");
      div.id = "yt-player-" + Date.now();
      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(div);

      player = new YT.Player(div.id, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (e: YT.PlayerEvent) => {
            playerRef.current = e.target;
            callbacksRef.current.onReady(e.target);
          },
          onStateChange: (e: YT.OnStateChangeEvent) => {
            if (e.data === YT.PlayerState.PLAYING) {
              const currentTime = e.target.getCurrentTime();
              if (Math.abs(currentTime - lastTimeRef.current) > 2) {
                callbacksRef.current.onSeek();
              }
              lastTimeRef.current = currentTime;
              callbacksRef.current.onPlay();
            } else if (e.data === YT.PlayerState.PAUSED) {
              lastTimeRef.current = e.target.getCurrentTime();
              callbacksRef.current.onPause();
            }
          },
        },
      });
    }

    if (typeof window !== "undefined" && window.YT && window.YT.Player) {
      createPlayer();
    } else {
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        tag.async = true;
        document.head.appendChild(tag);
      }
      (window as unknown as Record<string, unknown>).onYouTubeIframeAPIReady = createPlayer;
    }

    return () => {
      if (player && typeof player.destroy === "function") {
        try {
          player.destroy();
        } catch {
          // ignore
        }
      }
    };
  }, [videoId]);

  return <div ref={containerRef} className="w-full h-full" />;
}
