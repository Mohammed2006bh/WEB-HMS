import { NextResponse } from "next/server";
import { storeGet, storeSet } from "../store";

export async function POST(req: Request) {
  try {
    const { code, name } = await req.json();
    if (!code || !name) {
      return NextResponse.json({ error: "Code and name required" }, { status: 400 });
    }

    const raw = await storeGet(`watch-party:${code}`);
    if (!raw) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const room = typeof raw === "string" ? JSON.parse(raw) : raw;

    const alreadyIn = room.members.find(
      (m: { name: string }) => m.name === name
    );
    if (!alreadyIn) {
      room.members.push({ name, peerId: null, isHost: false });
      await storeSet(`watch-party:${code}`, JSON.stringify(room), 86400);
    }

    return NextResponse.json({ room });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
