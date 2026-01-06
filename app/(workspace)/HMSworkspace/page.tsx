"use client";

import SBody from "@/app/components/SBody";
import Link from "next/link";

export default function Home() {
  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden">

      {/* Background */}
      <img
        className="absolute inset-0 w-full h-full object-cover"
        src="https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=2070&q=80"
        alt=""
      />

      {/* Logo - خارج SBody */}
      <img
         src="/HMS_logo.png"
         alt="HMS Logo"
         className="
         absolute
         top-2
         right-1/2
         left-1/2
         -translate-x-1/2
         w-[220px]
         opacity-95
         drop-shadow-2xl
         transition-transform duration-300
  "
/>

      {/* Content */}
      <SBody>
        <h1 className="text-4xl font-hairline tracking-tight text-gray-900 dark:text-white text-center">
          HMS NINA
        </h1>

        <div className="flex flex-col gap-4 mt-8">

          <Link href="/HMSworkspace/create">
            <button
              className="
                px-8 py-3 text-lg rounded-xl
                bg-black text-white
                dark:bg-white dark:text-black
                transition-all duration-300 ease-out
                hover:scale-[1.03] hover:shadow-xl
                active:scale-[0.97]
                w-full
              "
            >
              Create Workspace
            </button>
          </Link>

          <Link href="/HMSworkspace/join">
            <button
              className="
                px-8 py-3 text-lg rounded-xl
                border border-black dark:border-white
                transition-all duration-300 ease-out
                hover:scale-[1.03] hover:bg-black hover:text-white
                dark:hover:bg-white dark:hover:text-black
                active:scale-[0.97]
                w-full
              "
            >
              Join Workspace
            </button>
          </Link>

          <Link href="/">
            <button
              className="
                text-lg rounded-xl
                transition-all duration-300
                opacity-70 hover:opacity-100
                hover:underline
                w-full
              "
            >
              Back
            </button>
          </Link>

        </div>
      </SBody>
    </main>
  );
}
