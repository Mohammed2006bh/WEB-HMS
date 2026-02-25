"use client";

import { useEffect, useState } from "react";

export default function MobileBlocker() {
  const [mounted, setMounted] = useState(false);
  const [bypass, setBypass] = useState(false);
  const [matchResult, setMatchResult] = useState<any>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [displayConfidence, setDisplayConfidence] = useState("");
  const [confidenceDone, setConfidenceDone] = useState(false);

  useEffect(() => {
    const detect = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const dpr = window.devicePixelRatio;
      const aspect = +(width / height).toFixed(2);
      const isTouch = navigator.maxTouchPoints > 0;

      const devices = [
        { name: "S24 Ultra", width: 568, dpr: 3, aspect: 0.46, isTouch: true },
        { name: "iPad Pro 11 M2", width: 1194, dpr: 2, aspect: 0.8, isTouch: true },
        { name: "MacBook Air", width: 1427, dpr: 2, aspect: 0.6, isTouch: false },
      ];

      let bestMatch = null;
      let highestScore = 0;

      devices.forEach((device) => {
        let score = 0;
        if (width === device.width) score += 40;
        if (Math.abs(dpr - device.dpr) < 0.5) score += 25;
        if (Math.abs(aspect - device.aspect) < 0.1) score += 20;
        if (isTouch === device.isTouch) score += 15;

        if (score > highestScore) {
          highestScore = score;
          bestMatch = device.name;
        }
      });

      if (highestScore >= 70) {
        setMatchResult({
          name: bestMatch,
          confidence: highestScore.toFixed(1),
        });
      }
    };

    detect();
    setMounted(true);
  }, []);

  // Fake Logs
  useEffect(() => {
    if (!confirmed || !matchResult) return;

    const fakeLogs = [
      "Initializing secure channel...",
      "Accessing Mohamed Core System...",
      "Reading device entropy...",
      "Verifying DPR signature...",
      "Matching aspect ratio...",
      "Calculating confidence score..."
    ];

    let i = 0;

    const interval = setInterval(() => {
      setLogs((prev) => [...prev, fakeLogs[i]]);
      i++;
      if (i >= fakeLogs.length) {
        clearInterval(interval);
        setScanning(true);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [confirmed, matchResult]);

  // Hacker Typing Confidence
  useEffect(() => {
    if (!scanning || !matchResult) return;

    const finalValue = matchResult.confidence + "%";
    let current = "";
    let index = 0;

    const typeInterval = setInterval(() => {
      current += finalValue[index];
      setDisplayConfidence(current);
      index++;

      if (index >= finalValue.length) {
        clearInterval(typeInterval);
        setConfidenceDone(true);
      }
    }, 120);

    return () => clearInterval(typeInterval);
  }, [scanning, matchResult]);

  if (!mounted || bypass || !matchResult) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black cyber-grid flex items-center justify-center text-green-400 font-mono overflow-hidden">

      {/* Binary Rain */}
      <div className="binary-rain"></div>

      <div className="relative bg-black/90 border border-green-500 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center">

        <h1 className="text-xl mb-4 tracking-widest">
          HMS ULTRA CYBER ACCESS v6
        </h1>

        {!confirmed && (
          <>
            <div className="border border-green-500 bg-green-500 text-black px-4 py-2 rounded-lg mb-6">
              Mohamed Device Signature Detected ✔
            </div>

            <button
              onClick={() => setConfirmed(true)}
              className="border border-green-500 px-4 py-2 rounded-lg 
                         hover:bg-green-500 hover:text-black 
                         transition-all duration-300 hover:scale-105"
            >
              Confirm Identity
            </button>
          </>
        )}

        {confirmed && (
          <>
            <div className="text-left text-xs text-green-500 space-y-1 mb-4 h-32 overflow-hidden">
              {logs.map((log, idx) => (
                <p key={idx}>
                  &gt; {log}
                </p>
              ))}
            </div>

            {scanning && (
              <p
                className={`text-sm mt-2 ${
                  confidenceDone ? "text-green-300 font-bold glow" : ""
                }`}
              >
                Signature match confidence: {displayConfidence}
                {!confidenceDone && <span className="blink">▌</span>}
              </p>
            )}

            {confidenceDone && (
              <button
                onClick={() => setBypass(true)}
                className="mt-6 border border-green-500 bg-green-500 text-black px-4 py-2 rounded-lg shadow-[0_0_20px_#22c55e] transition-all duration-500"
              >
                Mohamed Device Signature Verified →
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}