/**
 * Powder Compact SVG Component
 * Makeup compact with opening/closing animation
 */

"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

interface PowderCompactProps {
  className?: string;
  color?: string;
}

export function PowderCompact({ className = "", color = "oklch(0.88 0.12 355)" }: PowderCompactProps) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Lid opens based on scroll progress
  const lidRotation = useTransform(scrollYProgress, [0, 0.5, 1], [0, -45, 0]);

  return (
    <svg
      ref={ref}
      viewBox="0 0 150 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Compact base */}
      <motion.rect
        x="30"
        y="50"
        width="90"
        height="15"
        rx="3"
        fill={color}
        opacity="0.28"
      />

      {/* Mirror inside */}
      <motion.rect
        x="35"
        y="55"
        width="80"
        height="8"
        rx="2"
        fill="oklch(1 0 0)"
        opacity="0.4"
      />

      {/* Compact lid */}
      <g style={{ transformOrigin: "30px 50px" }}>
        <motion.rect
          x="30"
          y="35"
          width="90"
          height="15"
          rx="3"
          fill={color}
          opacity="0.30"
          style={{ rotate: lidRotation }}
        />

        {/* Logo detail on lid */}
        <motion.circle
          cx="75"
          cy="42"
          r="5"
          fill="oklch(1 0 0)"
          opacity="0.35"
          style={{ rotate: lidRotation }}
        />
      </g>

      {/* Hinge */}
      <motion.line
        x1="30"
        y1="50"
        x2="120"
        y2="50"
        stroke="oklch(0 0 0)"
        strokeWidth="1"
        opacity="0.18"
      />
    </svg>
  );
}
