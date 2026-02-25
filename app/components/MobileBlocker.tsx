"use client";

import { useEffect, useState } from "react";

export default function MobileBlocker() {
  const [isPhone, setIsPhone] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("allowMobile");
    if (saved === "true") {
      setAllowed(true);
    }

    const checkScreen = () => {
        const currentWidth = window.innerWidth;
        const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      
        setWidth(currentWidth);
      
        if (currentWidth < 900 && isTouch) {
          setIsPhone(true);
        } else {
          setIsPhone(false);
        }
      };

    checkScreen();
    setMounted(true);

    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  const handleContinue = () => {
    localStorage.setItem("allowMobile", "true");
    setAllowed(true);
  };

  if (!mounted || allowed) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex items-center justify-center text-green-400 font-mono transition-opacity duration-500 animate-fadeIn">
      <div className="bg-black border border-green-500 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center transform transition-all duration-500 scale-100 opacity-100">

        <h1 className="text-xl mb-4 tracking-widest">
          HMS SYSTEM ACCESS WARNING
        </h1>

        <p className="text-sm text-green-300 mb-4">
            Device width detected: {width}px
        </p>

        <p className="text-sm text-green-500 mb-6">
          This interface is optimized for desktop environments.
          Running on mobile may result in layout instability.
        </p>

        <button
          onClick={handleContinue}
          className="border border-green-500 px-4 py-2 rounded-lg hover:bg-green-500 hover:text-black transition-all duration-300"
        >
          Continue Anyway →
        </button>

        <p className="text-xs text-green-700 mt-6">
          HMS Hybrid Protection Layer v1.0
        </p>
      </div>
    </div>
  );
}