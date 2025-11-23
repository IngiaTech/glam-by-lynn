/**
 * Animation Variants Library
 * Centralized animation configurations for consistency
 */

import { Variants } from "framer-motion";

/**
 * Fade in from bottom with slide
 */
export const fadeInUp: Variants = {
  hidden: {
    opacity: 0,
    y: 50,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
};

/**
 * Fade in without movement
 */
export const fadeIn: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
};

/**
 * Stagger children animations
 */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

/**
 * Scale and fade in (for cards/products)
 */
export const scaleIn: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1], // Custom easing
    },
  },
};

/**
 * Floating animation (for makeup products)
 */
export const floating = {
  animate: {
    y: [-10, 10],
    transition: {
      duration: 4,
      repeat: Infinity,
      repeatType: "reverse" as const,
      ease: "easeInOut",
    },
  },
};

/**
 * Rotation animation (for circular elements)
 */
export const rotate = {
  animate: {
    rotate: [0, 360],
    transition: {
      duration: 20,
      repeat: Infinity,
      ease: "linear",
    },
  },
};

/**
 * Morphing blob animation (for color splashes)
 */
export const morph = {
  animate: {
    scale: [1, 1.1, 1],
    x: [-20, 20, -20],
    transition: {
      duration: 8,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

/**
 * Subtle pulse (for emphasis)
 */
export const pulse = {
  animate: {
    scale: [1, 1.05, 1],
    opacity: [0.1, 0.15, 0.1],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

/**
 * Slide in from left
 */
export const slideInLeft: Variants = {
  hidden: {
    opacity: 0,
    x: -100,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
};

/**
 * Slide in from right
 */
export const slideInRight: Variants = {
  hidden: {
    opacity: 0,
    x: 100,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
};
