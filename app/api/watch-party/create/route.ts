import { NextResponse } from "next/server";
import { storeGet, storeSet } from "../store";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST(req: Request) {
  try {
    const { hostName } = await req.json();
    if (!hostName) {
      return NextResponse.json({ error: "Name required" }, { status: 400 });
    }

    let code = generateCode();
    let exists = await storeGet(`watch-party:${code}`);
    while (exists) {
      code = generateCode();
      exists = await storeGet(`watch-party:${code}`);
    }

    const room = {
      code,
      hostName,
      hostPeerId: null,
      contentUrl: null,
      contentType: null,
      members: [{ name: hostName, peerId: null, isHost: true }],
      createdAt: Date.now(),
    };

    await storeSet(`watch-party:${code}`, JSON.stringify(room), 86400);

    return NextResponse.json({ code });
  } catch (err) {
    console.error("watch-party create error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
