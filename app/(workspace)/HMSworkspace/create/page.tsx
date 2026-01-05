"use client";

import SBody from "@/app/components/SBody";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CreatePage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState("");
  const [members, setMembers] = useState(2);
  const [language, setLanguage] = useState("JavaScript");

  useEffect(() => {
    setMounted(true);
  }, []);

  const createWorkspace = async () => {
    if (!title.trim()) return;
  
    const res = await fetch("/api/create-project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectName: title,
        language,
      }),
    });
  
    if (res.ok) {
      router.push("/HMSworkspace/NINA");
    } else {
      const data = await res.json();
      alert(data.error || "Failed to create project");
    }
  };
  

  return (
    <main className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
      <SBody>
        <div
          className={`w-full max-w-3xl px-6 sm:px-10 md:px-16 lg:px-24
            transition-all duration-300 ease-out
            ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}
          `}
        >
          {/* Title */}
          <h1 className="mb-10 text-3xl font-apple font-semibold tracking-tight text-center text-gray-900 dark:text-white">
            Create Workspace
          </h1>

          {/* Form */}
          <div className="space-y-6">
            {/* Project title */}
            <input
              value={title}
              onChange={(e) => {
                const value = e.target.value
                  .toLowerCase()              // lowercase
                  .replace(/\s+/g, "-")       // spaces -> -
                  .replace(/[^a-z0-9-]/g, ""); // remove symbols

                setTitle(value);
              }}
              placeholder="project-name"
              className="
                w-full rounded-xl border border-gray-300 dark:border-gray-700
                px-[140px] py-3.5 text-base
                outline-none transition
                focus:border-black focus:ring-2 focus:ring-black/20
                dark:bg-black dark:text-white
                dark:focus:border-white dark:focus:ring-white/20
              "
            />

            {/* Team size */}
            <div className="space-y-2">
              <label className="block text-base font-medium text-gray-700 dark:text-gray-300">
                Team size
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={members}
                onChange={(e) => setMembers(Number(e.target.value))}
                className="
                  w-full rounded-xl border border-gray-300 dark:border-gray-700
                  px-5 py-3.5 text-base
                  outline-none transition
                  focus:border-black focus:ring-2 focus:ring-black/20
                  dark:bg-black dark:text-white
                  dark:focus:border-white dark:focus:ring-white/20
                "
              />
            </div>

            {/* Project language */}
            <div className="space-y-2">
              <label className="block text-base font-medium text-gray-700 dark:text-gray-300">
                Project language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="
                  w-full rounded-xl border border-gray-300 dark:border-gray-700
                  px-5 py-3.5 text-base
                  outline-none transition
                  focus:border-black focus:ring-2 focus:ring-black/20
                  dark:bg-black dark:text-white
                  dark:focus:border-white dark:focus:ring-white/20
                "
              >
                <option>JavaScript</option>
                <option>TypeScript</option>
                <option>Python</option>
                <option>Java</option>
                <option>C++</option>
                <option>Go</option>
                <option>Other</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-10 flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="
                text-base font-medium text-gray-600
                transition-all duration-200 ease-out
                hover:text-gray-900 hover:-translate-x-1
                active:translate-x-0 active:opacity-80
                dark:text-gray-400 dark:hover:text-gray-200
              "    
            >
              ← Back
            </button>

            <button
              disabled={!title}
              onClick={createWorkspace}
              className="
                rounded-xl bg-black px-7 py-3.5 text-base font-medium text-white
                transition hover:opacity-90 active:scale-[0.98]
                disabled:opacity-40 disabled:cursor-not-allowed
                dark:bg-white dark:text-black
              "
            >
              Create →
            </button>
          </div>
        </div>
      </SBody>
    </main>
  );
}
