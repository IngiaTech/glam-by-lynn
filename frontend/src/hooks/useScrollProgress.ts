/**
 * useScrollProgress Hook
 * Tracks scroll progress for animations
 */

"use client";

import { useScroll, useTransform, MotionValue } from "framer-motion";

interface ScrollProgressOptions {
  /**
   * Scroll offset range
   */
  offset?: [string, string];
  /**
   * Custom target element
   */
  target?: React.RefObject<HTMLElement>;
}

export function useScrollProgress(options: ScrollProgressOptions = {}): {
  scrollYProgress: MotionValue<number>;
  scrollY: MotionValue<number>;
} {
  const { offset = ["start start" as const, "end end" as const], target } = options;

  const { scrollYProgress, scrollY } = useScroll({
    target,
    offset: offset as any, // Type assertion to satisfy framer-motion's strict types
  });

  return { scrollYProgress, scrollY };
}

/**
 * Helper to create parallax transform values
 */
export function useParallaxTransform(
  scrollYProgress: MotionValue<number>,
  distance: number = 300
): MotionValue<number> {
  return useTransform(scrollYProgress, [0, 1], [0, -distance]);
}
