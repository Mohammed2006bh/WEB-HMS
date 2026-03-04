"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function WatchPartyLanding() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"idle" | "create" | "join">("idle");
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const joinCode = searchParams.get("join");
    if (joinCode) {
      setRoomCode(joinCode.toUpperCase());
      setMode("join");
    }
  }, [searchParams]);

  const handleCreate = async () => {
    if (!name.trim()) return setError("Enter your name");
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/watch-party/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostName: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/watch-party/${data.code}?name=${encodeURIComponent(name.trim())}&host=1`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!name.trim()) return setError("Enter your name");
    if (!roomCode.trim()) return setError("Enter room code");
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/watch-party/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: roomCode.trim().toUpperCase(), name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(
        `/watch-party/${roomCode.trim().toUpperCase()}?name=${encodeURIComponent(name.trim())}`
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <div className="w-full max-w-md mx-4">
        <div
          className="rounded-2xl p-8 text-center"
          style={{
            background: "rgba(255,255,255,0.08)",
            backdropFilter: "blur(18px)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
          }}
        >
          <h1 className="text-4xl font-bold text-white mb-2">Watch Party</h1>
          <p className="text-gray-400 mb-8 text-sm">
            Watch together, talk together
          </p>

          {mode === "idle" && (
            <div className="flex flex-col gap-4">
              <button
                onClick={() => setMode("create")}
                className="w-full py-3 px-6 rounded-xl text-lg font-medium bg-[#4CAF50] text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-green-500/20 active:scale-[0.98]"
              >
                Create Room
              </button>
              <button
                onClick={() => setMode("join")}
                className="w-full py-3 px-6 rounded-xl text-lg font-medium border border-white/20 text-white transition-all duration-300 hover:scale-[1.02] hover:bg-white/10 active:scale-[0.98]"
              >
                Join Room
              </button>
            </div>
          )}

          {mode === "create" && (
            <div className="flex flex-col gap-4">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-xl px-4 py-3 text-center text-lg bg-white/10 text-white placeholder-gray-500 outline-none border border-white/10 focus:border-[#4CAF50]/50 transition-colors"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                onClick={handleCreate}
                disabled={loading}
                className="w-full py-3 rounded-xl text-lg font-medium bg-[#4CAF50] text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create"}
              </button>
              <button
                onClick={() => { setMode("idle"); setError(""); }}
                className="text-gray-500 text-sm hover:text-white transition-colors"
              >
                Back
              </button>
            </div>
          )}

          {mode === "join" && (
            <div className="flex flex-col gap-4">
              <input
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Room code"
                maxLength={6}
                className="w-full rounded-xl px-4 py-3 text-center text-2xl tracking-[0.3em] font-mono bg-white/10 text-white placeholder-gray-500 outline-none border border-white/10 focus:border-[#4CAF50]/50 transition-colors"
              />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-xl px-4 py-3 text-center text-lg bg-white/10 text-white placeholder-gray-500 outline-none border border-white/10 focus:border-[#4CAF50]/50 transition-colors"
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              />
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                onClick={handleJoin}
                disabled={loading}
                className="w-full py-3 rounded-xl text-lg font-medium bg-[#4CAF50] text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? "Joining..." : "Join"}
              </button>
              <button
                onClick={() => { setMode("idle"); setError(""); }}
                className="text-gray-500 text-sm hover:text-white transition-colors"
              >
                Back
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
