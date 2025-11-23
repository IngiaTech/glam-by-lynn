/**
 * Hero Parallax Background Component
 * Premium parallax background for the hero section with floating makeup products
 */

"use client";

import { ParallaxContainer } from "./ParallaxContainer";
import { Lipstick } from "./svg/Lipstick";
import { MakeupBrush } from "./svg/MakeupBrush";
import { PowderCompact } from "./svg/PowderCompact";
import { LipGloss } from "./svg/LipGloss";
import { BalmTin } from "./svg/BalmTin";
import { FlowingHair } from "./svg/FlowingHair";
import { ColorSplash } from "./svg/ColorSplash";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export function HeroParallaxBackground() {
  const prefersReducedMotion = useReducedMotion();

  // Disable animations for accessibility
  if (prefersReducedMotion) {
    return null;
  }

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Far background layer - slowest movement (0.2x) */}
      <ParallaxContainer speed={0.2} className="absolute inset-0">
        {/* Large color splashes */}
        <ColorSplash
          size="large"
          className="absolute -top-40 -left-40 w-[500px] h-[500px]"
          color="oklch(0.88 0.12 355)"
        />
        <ColorSplash
          size="large"
          className="absolute -bottom-40 -right-40 w-[500px] h-[500px]"
          color="oklch(0.75 0.18 350)"
        />

        {/* Flowing hair shapes in corners */}
        <FlowingHair
          className="absolute top-0 left-0 w-full h-64 opacity-70"
          color="oklch(0.88 0.12 355)"
        />
        <FlowingHair
          className="absolute bottom-0 right-0 w-full h-64 opacity-70 rotate-180"
          color="oklch(0.75 0.18 350)"
        />
      </ParallaxContainer>

      {/* Mid layer - medium speed (0.5x) */}
      <ParallaxContainer speed={0.5} className="absolute inset-0">
        {/* Medium color splashes */}
        <ColorSplash
          size="medium"
          className="absolute top-1/4 left-1/4 w-80 h-80"
          color="oklch(0.88 0.12 355)"
        />
        <ColorSplash
          size="medium"
          className="absolute bottom-1/3 right-1/3 w-80 h-80"
          color="oklch(0.75 0.18 350)"
        />

        {/* Makeup products - distributed */}
        <Lipstick className="absolute top-[15%] left-[10%] w-20 h-40" />
        <MakeupBrush className="absolute top-[60%] right-[15%] w-20 h-40" />
        <BalmTin className="absolute bottom-[20%] left-[20%] w-32 h-20" />
      </ParallaxContainer>

      {/* Near layer - faster movement (0.8x) */}
      <ParallaxContainer speed={0.8} className="absolute inset-0">
        {/* Small color splashes */}
        <ColorSplash
          size="small"
          className="absolute top-1/3 right-1/4 w-56 h-56"
          color="oklch(0.88 0.12 355)"
        />

        {/* More makeup products - foreground */}
        <LipGloss className="absolute top-[40%] left-[15%] w-16 h-32" />
        <Lipstick className="absolute top-[20%] right-[20%] w-16 h-32" />
        <PowderCompact className="absolute bottom-[30%] right-[10%] w-28 h-20" />
        <MakeupBrush className="absolute top-[70%] left-[25%] w-16 h-32" />
      </ParallaxContainer>

      {/* Gradient overlay for text legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/50 to-background/80 pointer-events-none" />
    </div>
  );
}
