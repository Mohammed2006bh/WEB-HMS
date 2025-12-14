"use client"

import { useEffect, useState } from "react"
import "./globals.css"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [dark, setDark] = useState(false)

  // عند تحميل الصفحة
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme")
    if (savedTheme === "dark") {
      setDark(true)
      document.body.classList.add("dark")
    }
  }, [])

  // عند الضغط على الزر
  const toggleTheme = () => {
    setDark(prev => {
      const newTheme = !prev
      if (newTheme) {
        document.body.classList.add("dark")
        localStorage.setItem("theme", "dark")
      } else {
        document.body.classList.remove("dark")
        localStorage.setItem("theme", "light")
      }
      return newTheme
    })
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="transition-colors duration-300">
        {/* Header */}
        <header className="border-b border-gray-800 p-6 text-center">
          <div className="flex justify-end mb-4">
            <button
              onClick={toggleTheme}
              className="border px-3 py-1 rounded"
            >
              🌓
            </button>
          </div>

          <h1 className="text-3xl font-bold">
            Hi, it&apos;s Mohamed! 🧑🏽‍💻
          </h1>

          <nav className="mt-4">
            <ul className="flex justify-center gap-6">
              <li><a href="/">Home</a></li>
              <li><a href="/tech">My Tech</a></li>
              <li><a href="/blog">Blog</a></li>
              <li><a href="/newthings">New Things</a></li>
            </ul>
          </nav>
        </header>

        <main>{children}</main>

        <footer className="border-t border-gray-800 text-center p-6 text-sm">
          © 2025 Mohamed Alhayki
        </footer>
      </body>
    </html>
  )
}

