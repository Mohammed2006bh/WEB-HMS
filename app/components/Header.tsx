"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function Header() {
  const [dark, setDark] = useState(false);
  const pathname = usePathname();

  // ===== Triple click state =====
  const [clickCount, setClickCount] = useState(0);

  // تحميل الثيم
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      document.body.classList.add("dark");
      setDark(true);
    }
  }, []);

  // مراقبة عدد النقرات على الصورة
  useEffect(() => {
    if (clickCount === 3) {
      window.open("/HMSworkspace", "_blank");
      setClickCount(0);
    }
  }, [clickCount]);

  // تبديل الثيم
  const toggleTheme = () => {
    if (dark) {
      document.body.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      document.body.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
    setDark(!dark);
  };

  // عند الضغط على الصورة
  const handleImageClick = () => {
    setClickCount((prev) => prev + 1);

    setTimeout(() => {
      setClickCount(0);
    }, 600);
  };

  const navLink = (href: string, label: string) => {
    const active = pathname === href;

    return (
      <Link
        href={href}
        className={`
          px-3 py-1 rounded-md transition-colors duration-300
          ${active ? "bg-white/20" : "hover:bg-white/10"}
        `}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="site-header mx-[55px] mt-6 flex items-center justify-between transition-all duration-500">
      
      {/* Left: Logo + Name */}
      <div className="flex items-center gap-3">
        <img
          src="https://raw.githubusercontent.com/Mohammed2006bh/WEB-HMS/refs/heads/main/public/Bro_LinkedIn.ico"
          alt="HMS Logo"
          width={50}
          height={50}
          onClick={handleImageClick}
          className="cursor-pointer rounded-full"
        />

        <h1 className="text-lg font-semibold">
          Mohamed <span className="font-bold">Alhayki</span>
        </h1>
      </div>

      {/* Center: Navigation */}
      <nav className="flex gap-2">
        {navLink("/", "Home")}
        {navLink("/tech", "My Tech")}
        {navLink("/blog", "Blog")}
        {navLink("/BroSum", "Bro's Things")}
        {navLink("/HMSAi", "HMS Ai")}
      </nav>

      {/* Right: Theme toggle */}
      <button
        onClick={toggleTheme}
        className="px-4 py-2 rounded-full bg-white/20 backdrop-blur text-sm hover:bg-white/30 transition-all duration-300"
      >
        {dark ? "☀ Light" : "🌙 Dark"}
      </button>
    </header>
  );
}
