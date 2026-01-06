import { kv } from "@vercel/kv";

export async function GET() {
  try {
    await kv.set("kv-test", "connected");
    const value = await kv.get("kv-test");

    return new Response(
      JSON.stringify({ success: true, value }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500 }
    );
  }
}
