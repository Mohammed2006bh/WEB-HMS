import { kv } from "@vercel/kv";

export async function GET() {
  await kv.set("hello", "KV is working 🚀");
  const value = await kv.get("hello");

  return Response.json({
    success: true,
    value,
  });
}