"use client"

import React, { useRef } from "react"
import { motion, useMotionValue, useTransform } from "framer-motion"
import { cn } from "@/lib/utils"

export function SpotlightCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const boundingRef = useRef<HTMLDivElement>(null)

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!boundingRef.current) return
    const rect = boundingRef.current.getBoundingClientRect()
    mouseX.set(e.clientX - rect.left)
    mouseY.set(e.clientY - rect.top)
  }

  return (
    <div
      ref={boundingRef}
      onMouseMove={handleMouseMove}
      className={cn("group relative overflow-hidden", className)}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: useTransform(
            [mouseX, mouseY],
            ([x, y]) => `radial-gradient(400px circle at ${x}px ${y}px, rgba(216,255,114,0.15), transparent 50%)`
          ),
        }}
      />
      {children}
    </div>
  )
}
