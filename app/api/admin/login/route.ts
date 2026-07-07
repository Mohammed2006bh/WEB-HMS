import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { MDRIVE_API_URL, ADMIN_COOKIE } from "../_lib";

// POST /api/admin/login -> forwards to M Drive, stores admin JWT in httpOnly cookie.
export async function POST(req: Request) {
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(`${MDRIVE_API_URL}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: "M Drive API unreachable", apiUrl: MDRIVE_API_URL },
      { status: 502 },
    );
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) {
    return NextResponse.json(
      { error: data.error || "Login failed" },
      { status: res.status || 401 },
    );
  }

  const store = await cookies();
  store.set(ADMIN_COOKIE, data.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return NextResponse.json({ ok: true, username: data.username });
}
