import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// M Drive backend base URL. Configure MDRIVE_API_URL on Vercel to point at the
// deployed M Drive API; defaults to the local dev server.
export const MDRIVE_API_URL =
  process.env.MDRIVE_API_URL || "http://localhost:4000";

export const ADMIN_COOKIE = "mdrive_admin";

export async function getAdminToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(ADMIN_COOKIE)?.value ?? null;
}

// Forwards a request to the M Drive admin API using the stored admin token.
export async function proxyAdmin(
  path: string,
  init: RequestInit = {},
): Promise<NextResponse> {
  const token = await getAdminToken();
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  try {
    const res = await fetch(`${MDRIVE_API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init.headers || {}),
      },
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: "M Drive API unreachable", apiUrl: MDRIVE_API_URL },
      { status: 502 },
    );
  }
}
