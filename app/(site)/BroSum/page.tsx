"use client";

import SBody from "@/app/components/SBody";
import { useState } from "react";

const notes = {
  ITCS214: [
    {
      name: "Chapter 1 – Linked Lists",
      url: "/MyNotes/ITCS214/chapter1-linked-lists.pdf",
    },
    {
      name: "Chapter 2 – Trees",
      url: "/MyNotes/ITCS214/chapter2-trees.pdf",
    },
  ],
  MATH101: [
    {
      name: "Limits Summary",
      url: "/MyNotes/MATH101/limits-summary.pdf",
    },
  ],
};

export default function MyNotes() {
  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const [activePdf, setActivePdf] = useState<string | null>(null);

  const toggleFolder = (subject: string) => {
    setOpenFolder(openFolder === subject ? null : subject);
  };

  return (
    <SBody>
      <div className="flex h-[80vh] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">

        {/* Sidebar */}
        <aside className="w-64 bg-zinc-100 dark:bg-zinc-900 p-4 overflow-y-auto">
          <h2 className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-4">
            My Notes
          </h2>

          {Object.entries(notes).map(([subject, files]) => (
            <div key={subject} className="mb-3">

              {/* Folder */}
              <button
                onClick={() => toggleFolder(subject)}
                className="
                  w-full text-left
                  flex items-center gap-2
                  text-sm font-medium
                  text-zinc-800 dark:text-zinc-200
                  hover:bg-zinc-200 dark:hover:bg-zinc-800
                  px-2 py-1 rounded
                  transition
                "
              >
                📁 {subject}
              </button>

              {/* Files */}
              {openFolder === subject && (
                <ul className="ml-6 mt-2 space-y-1">
                  {files.map((file) => (
                    <li
                      key={file.name}
                      onClick={() => setActivePdf(file.url)}
                      className={`
                        cursor-pointer text-sm px-2 py-1 rounded transition
                        ${
                          activePdf === file.url
                            ? "bg-zinc-300 dark:bg-zinc-700 text-zinc-900 dark:text-white"
                            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                        }
                      `}
                    >
                      📄 {file.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </aside>

        {/* PDF Viewer */}
        <main className="flex-1 bg-white dark:bg-zinc-950">
          {activePdf ? (
            <iframe
              src={activePdf}
              className="w-full h-full"
              title="PDF Preview"
            />
          ) : (
            <div className="h-full flex items-center justify-center text-zinc-400 dark:text-zinc-600">
              Select a note to preview 📄
            </div>
          )}
        </main>

      </div>
    </SBody>
  );
}
