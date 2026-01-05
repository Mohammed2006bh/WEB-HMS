"use client";

import SBody from "@/app/components/SBody";
import Link from "next/link";

export default function Home() {
  return (
    
    <main className="min-h-screen flex items-center justify-center">

      <SBody>
        <h1 className="translate-y-[-15px] text-4xl font-hairline tracking-tight text-gray-900 dark:text-white">
          HMS NINA
        </h1>


        <div className="flex flex-col gap-4">
            <Link href="/HMSworkspace/create">
                <button className="px-8 py-3 text-lg rounded-xl bg-black text-white dark:bg-white dark:text-black transition w-full">
                Create Workspace
                </button>
            </Link>

            <Link href="/HMSworkspace/join">
              <button className="px-8 py-3 text-lg rounded-xl border border-black dark:border-white transition w-full">
                Join Workspace
                </button>
            </Link>

            <Link href="/">
              <button className=" text-lg rounded-xl transition w-full">
                Back
                </button>
            </Link>
        </div>


        </SBody>

    </main>
    
  );
}
