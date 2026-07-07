"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Stats = {
  system: {
    status: string;
    uptimeSeconds: number;
    cpuUsagePercent: number;
    cpuCount: number;
    memoryUsedBytes: number;
    memoryTotalBytes: number;
    memoryUsagePercent: number;
    storageUsedBytes: number;
    platform: string;
  };
  platform: {
    totalUsers: number;
    activeUsers: number;
    suspendedUsers: number;
    dailyTrips: number;
    totalTrips: number;
    verifiedTrips: number;
    totalPosts: number;
    databaseSizeBytes: number;
  };
};

type Report = {
  postId: string;
  authorName: string;
  caption: string;
  reports: number;
  createdAt: number;
};

type AdminUser = {
  id: string;
  username: string;
  email: string;
  suspended: boolean;
  eligibilityVerified: boolean;
  createdAt: number;
};

function bytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function uptime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m ${s % 60}s`;
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
      <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub && <div className="mt-1 text-xs text-neutral-500">{sub}</div>}
    </div>
  );
}

function Bar({ label, percent }: { label: string; percent: number }) {
  const color =
    percent > 85 ? "bg-red-500" : percent > 60 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-neutral-400">{label}</span>
        <span className="font-medium">{percent}%</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral-800">
        <div className={`h-full ${color}`} style={{ width: `${Math.min(100, percent)}%` }} />
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError("");
    try {
      const [s, r, u] = await Promise.all([
        fetch("/api/admin/stats", { cache: "no-store" }),
        fetch("/api/admin/reports", { cache: "no-store" }),
        fetch("/api/admin/users", { cache: "no-store" }),
      ]);
      if (s.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!s.ok) {
        const d = await s.json().catch(() => ({}));
        setError(d.error || "Failed to load stats");
        return;
      }
      setStats(await s.json());
      setReports((await r.json()).reports ?? []);
      setUsers((await u.json()).users ?? []);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [load]);

  async function removePost(postId: string) {
    await fetch(`/api/admin/posts/${postId}/remove`, { method: "POST" });
    load();
  }

  async function toggleSuspend(u: AdminUser) {
    await fetch(`/api/admin/users/${u.id}/suspend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suspend: !u.suspended }),
    });
    load();
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center text-neutral-400">
        Loading dashboard…
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">M Drive Admin</h1>
          <p className="text-sm text-neutral-500">
            Operational overview — no personal device data is accessible here.
          </p>
        </div>
        <button
          onClick={logout}
          className="rounded-lg border border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-800"
        >
          Sign out
        </button>
      </header>

      {error && (
        <p className="mb-6 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      {stats && (
        <>
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
              System status
            </h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Stat
                label="Server"
                value={stats.system.status === "online" ? "Online" : "Offline"}
                sub={stats.system.platform}
              />
              <Stat label="Uptime" value={uptime(stats.system.uptimeSeconds)} />
              <Bar label="CPU" percent={stats.system.cpuUsagePercent} />
              <Bar label="Memory" percent={stats.system.memoryUsagePercent} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
              <Stat
                label="Memory used"
                value={bytes(stats.system.memoryUsedBytes)}
                sub={`of ${bytes(stats.system.memoryTotalBytes)}`}
              />
              <Stat label="Storage (DB)" value={bytes(stats.system.storageUsedBytes)} />
              <Stat label="CPU cores" value={String(stats.system.cpuCount)} />
              <Stat
                label="DB size"
                value={bytes(stats.platform.databaseSizeBytes)}
              />
            </div>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
              Platform statistics
            </h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Stat label="Total users" value={String(stats.platform.totalUsers)} />
              <Stat label="Active (24h)" value={String(stats.platform.activeUsers)} />
              <Stat label="Daily trips" value={String(stats.platform.dailyTrips)} />
              <Stat label="Total posts" value={String(stats.platform.totalPosts)} />
              <Stat label="Total trips" value={String(stats.platform.totalTrips)} />
              <Stat
                label="Verified trips"
                value={String(stats.platform.verifiedTrips)}
              />
              <Stat
                label="Suspended"
                value={String(stats.platform.suspendedUsers)}
              />
            </div>
          </section>
        </>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
          Reported content ({reports.length})
        </h2>
        {reports.length === 0 ? (
          <p className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 text-sm text-neutral-500">
            No reported content.
          </p>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <div
                key={r.postId}
                className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/60 p-4"
              >
                <div>
                  <div className="text-sm font-medium">{r.authorName}</div>
                  <div className="text-sm text-neutral-400">{r.caption || "(no caption)"}</div>
                  <div className="mt-1 text-xs text-red-400">{r.reports} report(s)</div>
                </div>
                <button
                  onClick={() => removePost(r.postId)}
                  className="rounded-lg bg-red-600/90 px-3 py-1.5 text-sm text-white hover:bg-red-500"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
          Accounts ({users.length})
        </h2>
        <div className="overflow-hidden rounded-xl border border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-900 text-neutral-500">
              <tr>
                <th className="px-4 py-2 font-medium">Username</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">ZK eligible</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-neutral-800">
                  <td className="px-4 py-2">{u.username}</td>
                  <td className="px-4 py-2 text-neutral-400">{u.email}</td>
                  <td className="px-4 py-2">
                    {u.eligibilityVerified ? (
                      <span className="text-emerald-400">✓ verified</span>
                    ) : (
                      <span className="text-neutral-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {u.suspended ? (
                      <span className="text-red-400">Suspended</span>
                    ) : (
                      <span className="text-emerald-400">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => toggleSuspend(u)}
                      className="rounded-lg border border-neutral-700 px-3 py-1 text-xs hover:bg-neutral-800"
                    >
                      {u.suspended ? "Unsuspend" : "Suspend"}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-neutral-500">
                    No accounts yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
