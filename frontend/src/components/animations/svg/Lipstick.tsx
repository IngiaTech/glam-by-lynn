/**
 * Lipstick SVG Component
 * Simple, elegant lipstick illustration with brand colors
 */

"use client";

import { motion } from "framer-motion";

interface LipstickProps {
  className?: string;
  color?: string;
}

export function Lipstick({ className = "", color = "oklch(0.88 0.12 355)" }: LipstickProps) {
  return (
    <svg
      viewBox="0 0 100 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Lipstick cap */}
      <motion.path
        d="M30 20 L70 20 L70 80 Q70 90 50 90 Q30 90 30 80 Z"
        fill={color}
        opacity="0.28"
        initial={{ opacity: 0.22 }}
        animate={{ opacity: [0.22, 0.28, 0.22] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Lipstick body */}
      <motion.rect
        x="35"
        y="75"
        width="30"
        height="80"
        rx="2"
        fill={color}
        opacity="0.25"
      />

      {/* Lipstick bullet */}
      <motion.path
        d="M40 155 L40 165 Q40 175 50 175 Q60 175 60 165 L60 155 Z"
        fill={color}
        opacity="0.35"
        animate={{
          y: [-2, 2],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
        }}
      />

      {/* Bottom detail */}
      <motion.circle
        cx="50"
        cy="165"
        r="3"
        fill="oklch(0 0 0)"
        opacity="0.10"
      />
    </svg>
  );
}
