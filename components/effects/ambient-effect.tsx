"use client";

import { useEffect, useRef } from "react";

interface AmbientEffectProps {
  effect: string | null;
  intensity?: number;
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
}

/**
 * Renders ambient particle effects (petals, sparkles, bubbles, stars, grid)
 */
export function AmbientEffect({ effect, intensity = 0.5, colors }: AmbientEffectProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!effect || !containerRef.current) return;

    const container = containerRef.current;
    container.style.setProperty("--ambient-intensity", String(intensity));

    // Clear existing particles
    container.innerHTML = "";

    if (effect === "floating_petals") {
      container.className = "ambient-petals";
      container.style.setProperty("--petal-color", colors?.secondary || "rgba(196,139,144,0.6)");
      for (let i = 0; i < 15; i++) {
        const petal = document.createElement("div");
        petal.className = "petal";
        petal.style.left = `${Math.random() * 100}%`;
        petal.style.animationDuration = `${8 + Math.random() * 8}s`;
        petal.style.animationDelay = `${Math.random() * 10}s`;
        petal.style.width = `${8 + Math.random() * 10}px`;
        petal.style.height = `${8 + Math.random() * 10}px`;
        container.appendChild(petal);
      }
    } else if (effect === "sparkle") {
      container.className = "ambient-sparkle";
      container.style.setProperty("--sparkle-color", colors?.accent || "#F2C94C");
      for (let i = 0; i < 20; i++) {
        const dot = document.createElement("div");
        dot.className = "sparkle-dot";
        dot.style.left = `${Math.random() * 100}%`;
        dot.style.top = `${Math.random() * 100}%`;
        dot.style.animationDuration = `${1 + Math.random() * 3}s`;
        dot.style.animationDelay = `${Math.random() * 3}s`;
        container.appendChild(dot);
      }
    } else if (effect === "bubbles") {
      container.className = "ambient-bubbles";
      for (let i = 0; i < 12; i++) {
        const bubble = document.createElement("div");
        bubble.className = "bubble";
        bubble.style.left = `${Math.random() * 100}%`;
        bubble.style.width = bubble.style.height = `${10 + Math.random() * 30}px`;
        bubble.style.animationDuration = `${6 + Math.random() * 8}s`;
        bubble.style.animationDelay = `${Math.random() * 8}s`;
        container.appendChild(bubble);
      }
    } else if (effect === "starlight") {
      container.className = "ambient-starlight";
      container.style.setProperty("--star-color", colors?.accent || "#D4AF37");
      for (let i = 0; i < 30; i++) {
        const star = document.createElement("div");
        star.className = "star";
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;
        star.style.animationDuration = `${2 + Math.random() * 4}s`;
        star.style.animationDelay = `${Math.random() * 4}s`;
        container.appendChild(star);
      }
    } else if (effect === "geometric_grid") {
      container.className = "ambient-geometric";
    }

    return () => {
      container.innerHTML = "";
      container.className = "";
    };
  }, [effect, intensity, colors]);

  if (!effect) return null;

  return <div ref={containerRef} />;
}
