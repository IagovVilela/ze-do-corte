/** Curva tipo editorial / expo-out (referência: sites showcase tipo landonorris.com). */
export const EASE_EDITORIAL: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const DURATION_SECTION = 0.85;
export const DURATION_ITEM = 0.72;

export const staggerContainer = (stagger = 0.1, delayChildren = 0.06) => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: stagger,
      delayChildren,
      when: "beforeChildren" as const,
    },
  },
});

export const staggerItem = {
  hidden: {
    opacity: 0,
    y: 44,
    filter: "blur(14px)",
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: DURATION_ITEM,
      ease: EASE_EDITORIAL,
    },
  },
};

export const staggerItemTight = {
  hidden: { opacity: 0, y: 28, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.62, ease: EASE_EDITORIAL },
  },
};

/** Palavra dentro de título com máscara vertical. */
export const titleWord = {
  hidden: { y: "108%", rotate: -0.8 },
  visible: {
    y: 0,
    rotate: 0,
    transition: { duration: 0.68, ease: EASE_EDITORIAL },
  },
};

export const fadeUpSmall = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE_EDITORIAL },
  },
};

export const scaleInLine = {
  hidden: { scaleX: 0, opacity: 0 },
  visible: {
    scaleX: 1,
    opacity: 1,
    transition: { duration: 0.75, ease: EASE_EDITORIAL },
  },
};
