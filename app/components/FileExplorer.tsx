"use client";

import { useState } from "react";

type FileItem = {
  name: string;
  url: string;
};

type FileExplorerProps = {
  title: string;
  data: Record<string, FileItem[]>;
  type: "pdf" | "image";
};

export default function FileExplorer({
  title,
  data,
  type,
}: FileExplorerProps) {
  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const [activeFile, setActiveFile] = useState<string | null>(null);

  const toggleFolder = (subject: string) => {
    setOpenFolder(openFolder === subject ? null : subject);
  };

  const handleFileSelect = (url: string) => {
    setActiveFile(url);
  };

  return (
    <div className="flex flex-col md:flex-row md:h-[80vh] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">

      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-zinc-100 dark:bg-zinc-900 p-4 overflow-y-auto border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800">
        <h2 className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-4">
          {title}
        </h2>

        {Object.entries(data).map(([subject, files]) => (
          <div key={subject} className="mb-3">
            <button
              onClick={() => toggleFolder(subject)}
              className="w-full text-left flex items-center gap-2 text-sm font-medium
              text-zinc-800 dark:text-zinc-200
              hover:bg-zinc-200 dark:hover:bg-zinc-800
              px-2 py-1 rounded transition"
            >
              📁 {subject}
            </button>

            {openFolder === subject && (
              <ul className="ml-6 mt-2 space-y-1">
                {files.map((file) => (
                  <li
                    key={file.name}
                    onClick={() => handleFileSelect(file.url)}
                    className={`cursor-pointer text-sm px-2 py-1 rounded transition
                      ${
                        activeFile === file.url
                          ? "bg-zinc-300 dark:bg-zinc-700 text-zinc-900 dark:text-white"
                          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                      }`}
                  >
                    {type === "pdf" ? "📄" : "🖼️"} {file.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </aside>

      {/* Viewer */}
      <main className="flex-1 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-300 min-h-[55vh] md:min-h-0">
        {activeFile ? (
          type === "pdf" ? (
            <div className="w-full h-full flex flex-col bg-zinc-100 dark:bg-zinc-900 transition-colors duration-300">
              {/* Mobile: open in new tab bar */}
              <div className="md:hidden flex items-center justify-between px-3 py-2 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-200 dark:bg-zinc-800">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">PDF Preview</span>
                <a
                  href={activeFile}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-3 py-1 rounded-lg bg-green-500 text-black font-semibold"
                >
                  Open Full ↗
                </a>
              </div>
              <iframe
                src={activeFile}
                className="w-full flex-1 min-h-[50vh]"
                title="PDF Preview"
              />
            </div>
          ) : (
            <div className="
              w-full h-full flex items-center justify-center p-4
              bg-gradient-to-br
              from-zinc-100 to-zinc-200
              dark:from-zinc-900 dark:to-black
              transition-colors duration-300
              min-h-[55vh]
            ">
              <img
                src={activeFile}
                alt="Preview"
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            </div>
          )
        ) : (
          <div className="h-full min-h-[55vh] flex items-center justify-center text-zinc-400 dark:text-zinc-600">
            Select a file to preview {type === "pdf" ? "📄" : "🖼️"}
          </div>
        )}
      </main>
    </div>
  );
}
