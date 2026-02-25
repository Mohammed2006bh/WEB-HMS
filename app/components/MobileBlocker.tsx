"use client";

import { useEffect, useState } from "react";

export default function MobileBlocker() {
  const [mounted, setMounted] = useState(false);
  const [isPhone, setIsPhone] = useState(false);
  const [bypass, setBypass] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [deviceData, setDeviceData] = useState<any>(null);
  const [matchResult, setMatchResult] = useState<any>(null);

  useEffect(() => {
    const detect = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const dpr = window.devicePixelRatio;
      const aspect = +(width / height).toFixed(2);
      const isTouch = navigator.maxTouchPoints > 0;

      const fingerprint = btoa(
        `${width}-${height}-${dpr}-${aspect}-${isTouch}`
      ).slice(0, 16);

      const current = { width, height, dpr, aspect, isTouch, fingerprint };
      setDeviceData(current);

      // Mohamed Device Profiles
      const devices = [
        {
          name: "S24 Ultra",
          width: 568,
          dpr: 3,
          aspect: 0.46,
          isTouch: true,
        },
        {
          name: "iPad Pro 11 M2",
          width: 1194,
          dpr: 2,
          aspect: 0.8,
          isTouch: true,
        },
        {
          name: "MacBook Air",
          width: 1427,
          dpr: 2,
          aspect: 0.6,
          isTouch: false,
        },
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

      if (highestScore > 60) {
        setMatchResult({
          name: bestMatch,
          confidence: highestScore.toFixed(1),
        });
      } else {
        setMatchResult(null);
      }

      if (isTouch && width < 900) setIsPhone(true);
      else setIsPhone(false);
    };

    detect();
    setMounted(true);

    window.addEventListener("resize", detect);
    return () => window.removeEventListener("resize", detect);
  }, []);

  if (!mounted || bypass || !isPhone) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex items-center justify-center text-green-400 font-mono animate-fadeIn">
      <div className="bg-black border border-green-500 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center">

        <h1 className="text-xl mb-4 tracking-widest">
          HMS ELITE FINGERPRINT ENGINE v4
        </h1>

        {deviceData && (
          <div className="text-xs text-green-500 mb-4 text-left space-y-1">
            <p>Width: {deviceData.width}</p>
            <p>DPR: {deviceData.dpr}</p>
            <p>Aspect: {deviceData.aspect}</p>
            <p>Touch: {deviceData.isTouch ? "Yes" : "No"}</p>
            <p>Fingerprint ID: {deviceData.fingerprint}</p>
          </div>
        )}

        {matchResult && !confirmed && (
          <div className="mb-6">
            <p className="text-sm mb-3">
              Device Signature Match Detected 😏
            </p>
            <p className="text-xs mb-3">
              Confidence: {matchResult.confidence}%
            </p>
            <button
              onClick={() => setConfirmed(true)}
              className="border border-green-500 px-4 py-2 rounded-lg hover:bg-green-500 hover:text-black transition-all duration-300"
            >
              Confirm Identity
            </button>
          </div>
        )}

        {confirmed && matchResult && (
          <div className="mb-6">
            <div className="border border-green-500 bg-green-500 text-black px-4 py-2 rounded-lg mb-3">
              Mohamed Device Signature Verified ✔
            </div>

            <p className="text-xs text-green-400">
              You are using the same device ({matchResult.name}) as Mohamed.
            </p>

            <p className="text-xs text-green-400 mt-2">
              Signature match confidence: {matchResult.confidence}%
            </p>
          </div>
        )}

        {!confirmed && (
          <button
            onClick={() => setBypass(true)}
            className="border border-green-500 px-4 py-2 rounded-lg hover:bg-green-500 hover:text-black transition-all duration-300"
          >
            Continue Anyway →
          </button>
        )}

        <p className="text-xs text-green-700 mt-6">
          HMS Hybrid Protection Layer v4
        </p>
      </div>
    </div>
  );
}