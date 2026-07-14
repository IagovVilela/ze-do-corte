/** Easings e variantes só da landing (independentes do resto do app). */

export const LN_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const LN_SPRING = { type: "spring" as const, stiffness: 380, damping: 28 };
export const LN_SPRING_SOFT = { type: "spring" as const, stiffness: 120, damping: 22 };

export const lnStagger = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.12 },
  },
};

export const lnFadeUp = {
  hidden: { opacity: 0, y: 36, filter: "blur(12px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: LN_EASE },
  },
};

export const lnClipUp = {
  hidden: { y: "110%" },
  show: {
    y: "0%",
    transition: { duration: 0.85, ease: LN_EASE },
  },
};
