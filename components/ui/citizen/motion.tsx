"use client";

/**
 * Presets d'animation Framer Motion — charte §11.
 * Réutilisables dans toute l'app pour une cohérence des transitions.
 */

export const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.3,
    },
  },
};

export const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.4 } },
};

export const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } },
};

export const cardHoverVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.02, transition: { duration: 0.2 } },
};

// Page transition standard (slide-in from right)
export const pageSlideInVariants = {
  hidden: { x: "100%", opacity: 0 },
  show: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    x: "-100%",
    opacity: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};

// Page transition immersive (zoom out du noir)
export const pageImmersiveVariants = {
  hidden: { opacity: 0, scale: 1.1, filter: "brightness(0)" },
  show: {
    opacity: 1,
    scale: 1,
    filter: "brightness(1)",
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};
