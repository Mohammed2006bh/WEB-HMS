"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function Header() {
  const [dark, setDark] = useState(false);
  const pathname = usePathname();

  // تحميل الثيم
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      document.body.classList.add("dark");
      setDark(true);
    }
  }, []);

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
      
      
      {/* Left: Name */}

    <img src="https://raw.githubusercontent.com/Mohammed2006bh/WEB-HMS/refs/heads/main/public/Bro_LinkedIn.ico" alt="" width={50} height={50} rounded-full="true"/>
      <h1 className="text-lg font-semibold">
        Mohamed <span className="font-bold">Alhayki</span>
      </h1>

      {/* Center: Navigation */}
      <nav className="flex gap-2">
        {navLink("/", "Home")}
        {navLink("/tech", "My Tech")}
        {navLink("/blog", "Blog")}
        {navLink("/BroSum", "My Notes")}
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