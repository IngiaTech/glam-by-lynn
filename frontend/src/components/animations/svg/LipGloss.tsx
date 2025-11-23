/**
 * Lip Gloss SVG Component
 * Lip gloss wand with gentle swing animation
 */

"use client";

import { motion } from "framer-motion";

interface LipGlossProps {
  className?: string;
  color?: string;
}

export function LipGloss({ className = "", color = "oklch(0.88 0.12 355)" }: LipGlossProps) {
  return (
    <svg
      viewBox="0 0 100 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Tube cap */}
      <motion.path
        d="M35 30 L65 30 L65 70 Q65 75 50 75 Q35 75 35 70 Z"
        fill={color}
        opacity="0.28"
      />

      {/* Tube body */}
      <motion.rect
        x="38"
        y="65"
        width="24"
        height="60"
        rx="2"
        fill={color}
        opacity="0.22"
      />

      {/* Gloss liquid inside */}
      <motion.rect
        x="40"
        y="90"
        width="20"
        height="30"
        rx="2"
        fill={color}
        opacity="0.38"
        animate={{
          height: [30, 35, 30],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Applicator wand */}
      <motion.g
        animate={{
          rotate: [-3, 3],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
        }}
        style={{ transformOrigin: "50px 75px" }}
      >
        <motion.line
          x1="50"
          y1="75"
          x2="50"
          y2="140"
          stroke={color}
          strokeWidth="2"
          opacity="0.30"
        />

        {/* Wand brush tip */}
        <motion.ellipse
          cx="50"
          cy="145"
          rx="4"
          ry="8"
          fill={color}
          opacity="0.35"
        />
      </motion.g>
    </svg>
  );
}
