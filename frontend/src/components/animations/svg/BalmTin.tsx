/**
 * Balm Tin SVG Component
 * Round balm tin with rotating lid
 */

"use client";

import { motion } from "framer-motion";

interface BalmTinProps {
  className?: string;
  color?: string;
}

export function BalmTin({ className = "", color = "oklch(0.88 0.12 355)" }: BalmTinProps) {
  return (
    <svg
      viewBox="0 0 120 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Tin base */}
      <motion.ellipse
        cx="60"
        cy="50"
        rx="35"
        ry="15"
        fill={color}
        opacity="0.25"
      />

      {/* Tin body */}
      <motion.rect
        x="25"
        y="35"
        width="70"
        height="15"
        fill={color}
        opacity="0.28"
      />

      {/* Balm inside */}
      <motion.ellipse
        cx="60"
        cy="40"
        rx="30"
        ry="10"
        fill={color}
        opacity="0.35"
        animate={{
          scale: [1, 1.02, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Rotating lid */}
      <motion.g
        animate={{
          rotate: [0, 360],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{ transformOrigin: "60px 30px" }}
      >
        <motion.ellipse
          cx="60"
          cy="30"
          rx="35"
          ry="15"
          fill={color}
          opacity="0.30"
        />

        {/* Logo mark on lid */}
        <motion.circle
          cx="70"
          cy="28"
          r="3"
          fill="oklch(1 0 0)"
          opacity="0.4"
        />
      </motion.g>

      {/* Shadow */}
      <motion.ellipse
        cx="60"
        cy="50"
        rx="38"
        ry="12"
        fill="oklch(0 0 0)"
        opacity="0.10"
      />
    </svg>
  );
}
