"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function JoinPage() {
  const router = useRouter();

  const [step, setStep] = useState<"idle" | "pin">("idle");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const submitPin = async () => {
    setError("");

    if (!pin) return;

    try {
      const res = await fetch("/PINS.csv");
      const text = await res.text();

      // نحول CSV إلى array
      const pins = text
        .split(",")
        .map((p) => p.trim());

      if (pins.includes(pin)) {
        // PIN صحيح
        router.push(`/HMSworkspace/${pin}`);
      } else {
        // PIN غلط
        setError("PIN is incorrect");
      }
    } catch (err) {
      setError("Something went wrong");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="relative w-full max-w-sm text-center">

        {/* STEP 1 */}
        {step === "idle" && (
          <div className="transition-all duration-300">
            <h1 className="mb-6 text-3xl font-apple font-semibold">
              Join Workspace
            </h1>

            <button
              onClick={() => setStep("pin")}
              className="w-full rounded-xl bg-black px-6 py-3 text-lg text-white dark:bg-white dark:text-black"
            >
              Enter PIN
            </button>
          </div>
        )}

        {/* STEP 2 */}
        {step === "pin" && (
          <div className="transition-all duration-300">
            <h1 className="mb-4 text-3xl font-apple font-semibold">
              Enter PIN
            </h1>

            <input
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Workspace PIN"
              className="mb-2 w-full rounded-xl border px-4 py-3 text-center text-lg outline-none"
            />

            {error && (
              <p className="mb-3 text-sm text-red-500">
                {error}
              </p>
            )}

            <button
              onClick={submitPin}
              className="w-full rounded-xl bg-black px-6 py-3 text-lg text-white dark:bg-white dark:text-black"
            >
              Join
            </button>

            <button
              onClick={() => setStep("idle")}
              className="mt-3 w-full text-sm text-gray-500"
            >
              Back
            </button>
          </div>
        )}

      </div>
    </main>
  );
}
