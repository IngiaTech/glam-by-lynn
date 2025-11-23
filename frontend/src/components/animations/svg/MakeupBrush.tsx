/**
 * Makeup Brush SVG Component
 * Simple, elegant makeup brush illustration
 */

"use client";

import { motion } from "framer-motion";

interface MakeupBrushProps {
  className?: string;
  color?: string;
}

export function MakeupBrush({ className = "", color = "oklch(0.88 0.12 355)" }: MakeupBrushProps) {
  return (
    <svg
      viewBox="0 0 100 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Brush bristles */}
      <motion.ellipse
        cx="50"
        cy="40"
        rx="18"
        ry="30"
        fill={color}
        opacity="0.32"
        animate={{
          scaleY: [1, 1.05, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Ferrule (metal part) */}
      <motion.rect
        x="42"
        y="65"
        width="16"
        height="20"
        fill="oklch(0 0 0)"
        opacity="0.18"
      />

      {/* Handle */}
      <motion.path
        d="M45 85 L45 170 Q45 175 50 175 Q55 175 55 170 L55 85"
        fill={color}
        opacity="0.25"
        animate={{
          rotate: [-2, 2],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
        }}
        style={{ transformOrigin: "50px 85px" }}
      />

      {/* Handle detail line */}
      <motion.line
        x1="48"
        y1="90"
        x2="48"
        y2="165"
        stroke={color}
        strokeWidth="1"
        opacity="0.28"
      />
    </svg>
  );
}
