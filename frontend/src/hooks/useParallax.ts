/**
 * useParallax Hook
 * Creates parallax scrolling effect with customizable depth
 */

"use client";

import { useTransform, useScroll, MotionValue } from "framer-motion";
import { useRef } from "react";

interface ParallaxOptions {
  /**
   * Parallax speed multiplier
   * 0.5 = moves at half scroll speed (background effect)
   * 1 = moves at scroll speed (no parallax)
   * 2 = moves at double scroll speed (foreground effect)
   */
  speed?: number;
  /**
   * Custom scroll range [start, end]
   */
  offset?: [number, number];
}

export function useParallax(options: ParallaxOptions = {}): {
  ref: React.RefObject<HTMLDivElement | null>;
  y: MotionValue<number>;
} {
  const { speed = 0.5, offset } = options;
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: offset || ["start end", "end start"],
  });

  // Transform scroll progress into parallax movement
  // Negative values move up as you scroll down (background effect)
  const y = useTransform(scrollYProgress, [0, 1], [0, -(speed * 300)]);

  return { ref, y };
}
