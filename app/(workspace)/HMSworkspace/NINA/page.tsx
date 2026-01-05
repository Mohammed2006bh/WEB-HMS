"use client";

import Editor from "@monaco-editor/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function NinaWorkspaceInner() {
  /* ========= URL PARAMS ========= */
  const searchParams = useSearchParams();

  const projectName = searchParams.get("project") || "unknown-project";
  const fileName = searchParams.get("file") || "main.txt";
  const language = searchParams.get("lang") || "plaintext";
  const usersCount = Number(searchParams.get("users")) || 1;

  /* ========= STATE ========= */
  const [code, setCode] = useState("");
  const [saved, setSaved] = useState(true);

  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(true);

  const [leftWidth, setLeftWidth] = useState(240);
  const [rightWidth, setRightWidth] = useState(320);

  /* ========= LOAD FILE ========= */
  useEffect(() => {
    fetch(`/api/project-file?project=${projectName}&file=${fileName}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.content !== undefined) {
          setCode(data.content);
        }
      });
  }, [projectName, fileName]);

  /* ========= SAVE FILE ========= */
  const saveFile = async () => {
    const res = await fetch("/api/project-file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project: projectName,
        file: fileName,
        content: code,
      }),
    });

    if (res.ok) setSaved(true);
  };

  /* ========= RESIZE ========= */
  const startResize = (
    side: "left" | "right",
    e: React.MouseEvent
  ) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = side === "left" ? leftWidth : rightWidth;

    const onMove = (ev: MouseEvent) => {
      const diff = ev.clientX - startX;
      if (side === "left") {
        setLeftWidth(Math.max(180, startWidth + diff));
      } else {
        setRightWidth(Math.max(240, startWidth - diff));
      }
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col">

      {/* Toolbar */}
      <header className="h-12 flex items-center justify-between px-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowLeft(!showLeft)}>☰</button>
          <input
            placeholder="Search"
            className="bg-zinc-900 px-3 py-1 rounded-md text-sm outline-none"
          />
        </div>

        <div className="flex items-center gap-4 text-sm">
          <span className="text-zinc-400">👥 {usersCount}</span>

          <button
            onClick={saveFile}
            className={`px-3 py-1 rounded-md transition ${
              saved
                ? "bg-zinc-800 text-zinc-400"
                : "bg-white text-black"
            }`}
          >
            {saved ? "Saved" : "Save"}
          </button>

          <button onClick={() => setShowRight(!showRight)}>☰</button>
        </div>
      </header>

      {/* Workspace */}
      <div className="flex flex-1 overflow-hidden">

        {showLeft && (
          <>
            <aside
              style={{ width: leftWidth }}
              className="bg-zinc-900 border-r border-zinc-800 p-4 text-sm"
            >
              <h2 className="text-zinc-400 mb-3">PROJECT FILES</h2>
              <ul>
                <li>{fileName}</li>
              </ul>
            </aside>

            <div
              onMouseDown={(e) => startResize("left", e)}
              className="w-1 cursor-col-resize bg-zinc-800 hover:bg-zinc-600"
            />
          </>
        )}

        <section className="flex-1">
          <Editor
            height="100%"
            theme="vs-dark"
            language={language}
            value={code}
            onChange={(v) => {
              setCode(v || "");
              setSaved(false);
            }}
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              wordWrap: "on",
              automaticLayout: true,
            }}
          />
        </section>

        {showRight && (
          <>
            <div
              onMouseDown={(e) => startResize("right", e)}
              className="w-1 cursor-col-resize bg-zinc-800 hover:bg-zinc-600"
            />

            <aside
              style={{ width: rightWidth }}
              className="bg-zinc-900 border-l border-zinc-800 p-4 text-sm"
            >
              <h2 className="text-zinc-400 mb-3">NINA AI</h2>
              <p>Project: {projectName}</p>
            </aside>
          </>
        )}
      </div>
    </main>
  );
}

export default function NinaWorkspace() {
  return (
    <Suspense fallback={<div className="text-white p-6">Loading NINA…</div>}>
      <NinaWorkspaceInner />
    </Suspense>
  );
}
