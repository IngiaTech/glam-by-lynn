/**
 * FadeInSection Component
 * Wrapper component that fades in content when scrolled into view
 */

"use client";

import { useRef } from "react";
import { motion, useInView, Variants } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { fadeInUp } from "@/lib/animation-variants";

interface FadeInSectionProps {
  children: React.ReactNode;
  /**
   * Custom animation variant
   */
  variant?: Variants;
  /**
   * Delay before animation starts (in seconds)
   */
  delay?: number;
  /**
   * Animation direction
   */
  direction?: "up" | "down" | "left" | "right" | "none";
  /**
   * Whether to animate only once
   */
  once?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

export function FadeInSection({
  children,
  variant,
  delay = 0,
  direction = "up",
  once = true,
  className = "",
}: FadeInSectionProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, margin: "-100px" });
  const prefersReducedMotion = useReducedMotion();

  // Disable animations if user prefers reduced motion
  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  // Direction-based variants
  const directionVariants: Record<string, Variants> = {
    up: {
      hidden: { opacity: 0, y: 50 },
      visible: { opacity: 1, y: 0 },
    },
    down: {
      hidden: { opacity: 0, y: -50 },
      visible: { opacity: 1, y: 0 },
    },
    left: {
      hidden: { opacity: 0, x: -50 },
      visible: { opacity: 1, x: 0 },
    },
    right: {
      hidden: { opacity: 0, x: 50 },
      visible: { opacity: 1, x: 0 },
    },
    none: {
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
    },
  };

  const selectedVariant = variant || directionVariants[direction];

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={selectedVariant}
      transition={{
        duration: 0.6,
        delay,
        ease: "easeOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
