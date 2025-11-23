/**
 * Flowing Hair SVG Component
 * Abstract wavy hair silhouette with morphing animation
 */

"use client";

import { motion } from "framer-motion";

interface FlowingHairProps {
  className?: string;
  color?: string;
}

export function FlowingHair({ className = "", color = "oklch(0.88 0.12 355)" }: FlowingHairProps) {
  // Different hair wave paths for morphing animation
  const path1 = "M 20 50 Q 50 20, 80 50 T 140 50 Q 170 80, 200 50 T 260 50";
  const path2 = "M 20 50 Q 50 80, 80 50 T 140 50 Q 170 20, 200 50 T 260 50";
  const path3 = "M 20 50 Q 50 35, 80 50 T 140 50 Q 170 65, 200 50 T 260 50";

  return (
    <svg
      viewBox="0 0 300 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Main flowing hair strand */}
      <motion.path
        d={path1}
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        opacity="0.18"
        animate={{
          d: [path1, path2, path3, path1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Secondary strand - slightly offset */}
      <motion.path
        d={path1}
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.15"
        animate={{
          d: [path2, path3, path1, path2],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{ transform: "translateY(20px)" }}
      />

      {/* Tertiary strand - more subtle */}
      <motion.path
        d={path3}
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.12"
        animate={{
          d: [path3, path1, path2, path3],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{ transform: "translateY(40px)" }}
      />
    </svg>
  );
}
