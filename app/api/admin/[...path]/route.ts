import { proxyAdmin } from "../_lib";

// Generic authenticated proxy for M Drive admin endpoints.
// GET  /api/admin/stats          -> GET  {API}/admin/stats
// GET  /api/admin/reports        -> GET  {API}/admin/reports
// GET  /api/admin/users          -> GET  {API}/admin/users
// GET  /api/admin/me             -> GET  {API}/admin/me
// POST /api/admin/posts/:id/remove   -> POST {API}/admin/posts/:id/remove
// POST /api/admin/users/:id/suspend  -> POST {API}/admin/users/:id/suspend
type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxyAdmin(`/admin/${path.join("/")}`, { method: "GET" });
}

export async function POST(req: Request, ctx: Ctx) {
  const { path } = await ctx.params;
  const body = await req.text();
  return proxyAdmin(`/admin/${path.join("/")}`, {
    method: "POST",
    body: body || "{}",
  });
}
