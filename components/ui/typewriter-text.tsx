"use client"

import React, { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

interface TypewriterTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  text: string
  speed?: number
  onComplete?: () => void
  startDelay?: number
}

const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  speed = 50,
  onComplete,
  startDelay = 0,
  className,
  ...props
}) => {
  const [displayedText, setDisplayedText] = useState("")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTyping, setIsTyping] = useState(false)

  useEffect(() => {
    if (startDelay > 0) {
      const delayTimer = setTimeout(() => {
        setIsTyping(true)
      }, startDelay)
      return () => clearTimeout(delayTimer)
    } else {
      setIsTyping(true)
    }
  }, [startDelay])

  useEffect(() => {
    if (!isTyping || currentIndex >= text.length) {
      if (currentIndex >= text.length && onComplete) {
        onComplete()
      }
      return
    }

    const timer = setTimeout(() => {
      setDisplayedText((prev) => prev + text[currentIndex])
      setCurrentIndex((prev) => prev + 1)
    }, speed)

    return () => clearTimeout(timer)
  }, [isTyping, currentIndex, text, speed, onComplete])

  // Reset when text changes
  useEffect(() => {
    setDisplayedText("")
    setCurrentIndex(0)
    setIsTyping(false) // Will be set to true after startDelay
  }, [text])

  return (
    <span className={cn("inline", className)} {...props}>
      {displayedText}
      {/* Optional: Add a blinking cursor */}
      {isTyping && currentIndex < text.length && (
        <span className="animate-pulse">▍</span>
      )}
    </span>
  )
}

export { TypewriterText }
