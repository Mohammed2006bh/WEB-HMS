export const runtime = "nodejs";
import fs from "fs";
import { NextResponse } from "next/server";
import path from "path";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const project = searchParams.get("project");
  const file = searchParams.get("file");

  if (!project || !file) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const filePath = path.join(
    process.cwd(),
    "NINAProjects",
    project,
    "src",
    file
  );

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const content = fs.readFileSync(filePath, "utf-8");
  return NextResponse.json({ content });
}

export async function POST(req: Request) {
  const { project, file, content } = await req.json();

  if (!project || !file || content === undefined) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  const filePath = path.join(
    process.cwd(),
    "NINAProjects",
    project,
    "src",
    file
  );

  fs.writeFileSync(filePath, content);
  return NextResponse.json({ success: true });
}
