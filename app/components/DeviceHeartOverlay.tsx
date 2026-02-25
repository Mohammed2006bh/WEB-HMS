"use client";

export default function DeviceHeartOverlay() {
  return (
    <div className="fixed bottom-6 right-6 z-[9998] pointer-events-none">
      <div className="w-12 h-12 rounded-full bg-green-500/20 backdrop-blur-md 
                      flex items-center justify-center 
                      shadow-[0_0_20px_#22c55e] 
                      animate-heartPulse">
        <span className="text-green-400 text-xl">💚</span>
      </div>
    </div>
  );
}