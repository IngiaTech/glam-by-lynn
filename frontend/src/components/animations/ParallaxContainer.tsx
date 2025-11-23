/**
 * ParallaxContainer Component
 * Creates parallax scrolling effect with multiple depth layers
 */

"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useRef } from "react";

interface ParallaxContainerProps {
  children: React.ReactNode;
  /**
   * Speed multiplier for parallax effect
   * 0.2 = far background (slow)
   * 0.5 = mid layer
   * 0.8 = near layer (faster)
   */
  speed?: number;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Starting offset
   */
  offset?: number;
}

export function ParallaxContainer({
  children,
  speed = 0.5,
  className = "",
  offset = 0,
}: ParallaxContainerProps) {
  const ref = useRef(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Transform scroll progress into parallax movement
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    [offset, offset - speed * 500]
  );

  // Disable parallax if user prefers reduced motion
  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      style={{ y }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
