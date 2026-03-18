"use client";

import { useEffect, useRef } from "react";

interface ScrollRevealProps {
  children: React.ReactNode;
  variant?: "fade_up" | "stagger_lines" | "slide_left";
  delay?: number;
  className?: string;
}

/**
 * Intersection Observer-based scroll reveal animation
 */
export function ScrollReveal({
  children,
  variant = "fade_up",
  delay = 0,
  className = "",
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            el.classList.add("visible");
          }, delay);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  const classes: Record<string, string> = {
    fade_up: "scroll-reveal",
    stagger_lines: "scroll-reveal-stagger",
    slide_left: "scroll-reveal-slide",
  };

  return (
    <div
      ref={ref}
      className={`${classes[variant] || "scroll-reveal"} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
