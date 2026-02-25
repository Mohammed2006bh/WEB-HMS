"use client";

import { useEffect, useState } from "react";

export default function MobileBlocker() {
  const [mounted, setMounted] = useState(false);
  const [bypass, setBypass] = useState(false);
  const [matchResult, setMatchResult] = useState<any>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [confidenceDone, setConfidenceDone] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);

  // Device Detection
  useEffect(() => {
    const detect = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const dpr = window.devicePixelRatio;
      const aspect = +(width / height).toFixed(2);
      const isTouch = navigator.maxTouchPoints > 0;

      const devices = [
        { name: "📱 S24 Ultra", width: 568, dpr: 3, aspect: 0.46 },
        { name: "📱 iPad Pro 11 inch", width: 1194, dpr: 2, aspect: 0.8 },
        { name: "💻 MacBook Air", width: 1427, dpr: 2, aspect: 0.6 }
      ];

      let bestMatch = null;
      let highestScore = 0;

      devices.forEach((device) => {
        let score = 0;
        if (width === device.width) score += 40;
        if (Math.abs(dpr - device.dpr) < 0.5) score += 25;
        if (Math.abs(aspect - device.aspect) < 0.1) score += 20;

        if (score > highestScore) {
          highestScore = score;
          bestMatch = device;
        }
      });

      if (highestScore >= 60 && bestMatch) {
        setMatchResult({ device: bestMatch });

        setDeviceInfo({
          width,
          dpr,
          aspect,
          isTouch
        });
      }
    };

    detect();
    setMounted(true);
  }, []);

  // Fake Logs + Touch Status
  useEffect(() => {
    if (!confirmed || !matchResult || !deviceInfo) return;

    const fakeLogs = [
      { text: "Initializing secure channel..." },
      { text: "Accessing Mohamed Core System..." },
      { text: "Reading device entropy..." },
      {
        text: `Touch capability detected: ${
          deviceInfo.isTouch ? "TRUE" : "FALSE"
        }`,
        type: deviceInfo.isTouch ? "true" : "false"
      },
      { text: "Verifying DPR signature..." },
      { text: "Generating confidence index..." }
    ];

    let i = 0;

    const interval = setInterval(() => {
      setLogs((prev) => [...prev, fakeLogs[i]]);
      i++;

      if (i >= fakeLogs.length) {
        clearInterval(interval);
        setTimeout(() => setScanning(true), 500);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [confirmed, matchResult, deviceInfo]);

  // Glitch Jump 0 → 96 → glitch → 100
  useEffect(() => {
    if (!scanning) return;

    let value = 0;

    const interval = setInterval(() => {
      value += Math.random() * 4;

      if (value >= 96) {
        value = 96;
        clearInterval(interval);
        setConfidence(96);
        glitchSequence();
      } else {
        setConfidence(Math.floor(value));
      }
    }, 40 + Math.random() * 30);

    return () => clearInterval(interval);
  }, [scanning]);

  const glitchSequence = () => {
    let glitchCount = 0;

    const glitchInterval = setInterval(() => {
      setConfidence(96);
      glitchCount++;

      if (glitchCount === 3) {
        clearInterval(glitchInterval);

        setLogs((prev) => [
          ...prev,
          { text: "— recalibrating entropy —" }
        ]);

        setTimeout(() => {
          setConfidence(100);
          setConfidenceDone(true);
        }, 900);
      }
    }, 200);
  };

  if (!mounted || bypass || !matchResult) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center 
                    text-green-400 font-mono overflow-hidden
                    bg-black/95 backdrop-blur-md animate-overlayFade">

      <div className="binary-rain"></div>

      <div className="relative bg-black/90 border border-green-500 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center">

        <h1 className="text-xl mb-4 tracking-widest">
          HMS ULTRA CYBER ACCESS v7
        </h1>

        {!confirmed && (
          <>
            <div className="border border-green-500 bg-green-500 text-black px-4 py-2 rounded-lg mb-6">
              Mohamed Device Signature Detected ✔
            </div>

            <div className="text-xs text-green-400 mb-6 text-left space-y-1">
              <p>Device: {matchResult.device.name}</p>
              <p>Width: {deviceInfo?.width}px</p>
              <p>DPR: {deviceInfo?.dpr}</p>
              <p>Aspect: {deviceInfo?.aspect}</p>
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
            <div className="text-left text-xs text-green-500 space-y-1 mb-4 h-36 overflow-hidden">
              {logs.map((log, idx) => (
                <p key={idx}>
                  &gt;{" "}
                  <span
                    className={
                      log.type === "true"
                        ? "text-green-300 font-bold glow"
                        : log.type === "false"
                        ? "text-red-400"
                        : ""
                    }
                  >
                    {log.text}
                  </span>
                </p>
              ))}
            </div>

            {scanning && (
              <p
                className={`text-sm mt-2 transition-all duration-300 ${
                  confidence === 100
                    ? "text-green-300 font-bold ultra-glow"
                    : ""
                }`}
              >
                Signature match confidence: {confidence}%
                {!confidenceDone && <span className="blink">▌</span>}
              </p>
            )}

            {confidenceDone && (
              <button
                onClick={() => setBypass(true)}
                className="mt-6 border border-green-500 bg-green-500 text-black px-4 py-2 rounded-lg shadow-[0_0_20px_#22c55e] transition-all duration-500"
              >
                You're Using The Same Device That I Use →
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}