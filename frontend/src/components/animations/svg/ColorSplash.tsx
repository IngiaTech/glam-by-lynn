/**
 * Color Splash SVG Component
 * Morphing gradient blob for color splashes
 */

"use client";

import { motion } from "framer-motion";

interface ColorSplashProps {
  className?: string;
  color?: string;
  size?: "small" | "medium" | "large";
}

export function ColorSplash({
  className = "",
  color = "oklch(0.88 0.12 355)",
  size = "medium",
}: ColorSplashProps) {
  const sizes = {
    small: { width: 200, height: 200, blur: 40 },
    medium: { width: 400, height: 400, blur: 60 },
    large: { width: 600, height: 600, blur: 80 },
  };

  const { width, height, blur } = sizes[size];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* Gradient definition */}
        <radialGradient id={`splash-gradient-${size}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.30" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>

        {/* Blur filter for soft edges */}
        <filter id={`blur-${size}`}>
          <feGaussianBlur in="SourceGraphic" stdDeviation={blur} />
        </filter>
      </defs>

      {/* Morphing blob */}
      <motion.circle
        cx={width / 2}
        cy={height / 2}
        r={width / 3}
        fill={`url(#splash-gradient-${size})`}
        filter={`url(#blur-${size})`}
        animate={{
          scale: [1, 1.2, 1],
          x: [-20, 20, -20],
          y: [-10, 10, -10],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Secondary smaller blob for depth */}
      <motion.circle
        cx={width / 2 + 50}
        cy={height / 2 - 50}
        r={width / 4}
        fill={`url(#splash-gradient-${size})`}
        filter={`url(#blur-${size})`}
        opacity="0.6"
        animate={{
          scale: [1.1, 0.9, 1.1],
          x: [10, -10, 10],
          y: [15, -15, 15],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </svg>
  );
}
