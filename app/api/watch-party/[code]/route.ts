import { NextResponse } from "next/server";
import { storeGet, storeSet } from "../store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const raw = await storeGet(`watch-party:${code}`);
    if (!raw) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    const room = typeof raw === "string" ? JSON.parse(raw) : raw;
    return NextResponse.json({ room });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const updates = await req.json();

    const raw = await storeGet(`watch-party:${code}`);
    if (!raw) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const room = typeof raw === "string" ? JSON.parse(raw) : raw;

    if (updates.contentUrl !== undefined) {
      room.contentUrl = updates.contentUrl;
      room.contentType = updates.contentType || null;
    }

    if (updates.peerId && updates.memberName) {
      const member = room.members.find(
        (m: { name: string }) => m.name === updates.memberName
      );
      if (member) {
        member.peerId = updates.peerId;
        if (member.isHost) room.hostPeerId = updates.peerId;
      }
    }

    if (updates.removeMember) {
      room.members = room.members.filter(
        (m: { name: string }) => m.name !== updates.removeMember
      );
    }

    await storeSet(`watch-party:${code}`, JSON.stringify(room), 86400);
    return NextResponse.json({ room });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
