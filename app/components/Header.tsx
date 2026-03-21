"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function Header() {
  const [dark, setDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  const [clickCount, setClickCount] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      document.body.classList.add("dark");
      setDark(true);
    }
  }, []);

  useEffect(() => {
    if (clickCount === 3) {
      window.open("/HMSworkspace", "_blank");
      setClickCount(0);
    }
  }, [clickCount]);

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
        onClick={() => setMenuOpen(false)}
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
    <header className="site-header mx-4 sm:mx-[55px] mt-6 transition-all duration-500">
      <div className="flex items-center justify-between">
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

        {/* Desktop Nav */}
        <nav className="hidden md:flex gap-2">
          {navLink("/", "Home")}
          {navLink("/tech", "My Tech")}
          {navLink("/blog", "Blog")}
          {navLink("/BroSum", "Bro's Things")}
          {navLink("/HMSAi", "HMS Ai")}
        </nav>

        {/* Desktop Theme Toggle */}
        <div className="hidden md:block">
          <button
            onClick={toggleTheme}
            className="px-4 py-2 rounded-full bg-white/20 backdrop-blur text-sm hover:bg-white/30 transition-all duration-300"
          >
            {dark ? "☀ Light" : "🌙 Dark"}
          </button>
        </div>

        {/* Mobile: Hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden flex flex-col justify-center items-center w-10 h-10 rounded-md bg-white/20 hover:bg-white/30 transition-all gap-1"
        >
          <span className={`block w-5 h-0.5 bg-white transition-all duration-300 ${menuOpen ? "rotate-45 translate-y-1.5" : ""}`} />
          <span className={`block w-5 h-0.5 bg-white transition-all duration-300 ${menuOpen ? "opacity-0" : ""}`} />
          <span className={`block w-5 h-0.5 bg-white transition-all duration-300 ${menuOpen ? "-rotate-45 -translate-y-1.5" : ""}`} />
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden mt-4 flex flex-col gap-1 border-t border-white/20 pt-4">
          {navLink("/", "Home")}
          {navLink("/tech", "My Tech")}
          {navLink("/blog", "Blog")}
          {navLink("/BroSum", "Bro's Things")}
          {navLink("/HMSAi", "HMS Ai")}
          <button
            onClick={toggleTheme}
            className="mt-2 px-3 py-1 rounded-md bg-white/20 backdrop-blur text-sm hover:bg-white/30 transition-all duration-300 text-left"
          >
            {dark ? "☀ Light" : "🌙 Dark"}
          </button>
        </div>
      )}
    </header>
  );
}
