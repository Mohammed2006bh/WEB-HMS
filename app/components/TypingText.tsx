"use client"

import { useEffect, useState } from "react"

const words = ["Programmer", "Designer", "YouTuber", "Developer"]

export default function TypingText() {
  const [text, setText] = useState("")
  const [wordIndex, setWordIndex] = useState(0)
  const [charIndex, setCharIndex] = useState(0)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const currentWord = words[wordIndex]
    let timeout: NodeJS.Timeout

    if (!deleting && charIndex < currentWord.length) {
      timeout = setTimeout(() => {
        setText(currentWord.slice(0, charIndex + 1))
        setCharIndex(charIndex + 1)
      }, 100)
    } else if (!deleting && charIndex === currentWord.length) {
      timeout = setTimeout(() => setDeleting(true), 1000)
    } else if (deleting && charIndex > 0) {
      timeout = setTimeout(() => {
        setText(currentWord.slice(0, charIndex - 1))
        setCharIndex(charIndex - 1)
      }, 60)
    } else if (deleting && charIndex === 0) {
      setDeleting(false)
      setWordIndex((wordIndex + 1) % words.length)
    }

    return () => clearTimeout(timeout)
  }, [charIndex, deleting, wordIndex])

  return (
    <span className="text-blue-500">
      {text}
      <span className="animate-pulse">|</span>
    </span>
  )
}