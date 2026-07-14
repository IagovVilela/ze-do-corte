"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, type PropsWithChildren } from "react";

type AnimatedSectionProps = PropsWithChildren<{
  id?: string;
  className?: string;
  delay?: number;
  motionOff?: boolean;
}>;

export function AnimatedSection({
  children,
  id,
  className,
  delay = 0,
  motionOff = false,
}: AnimatedSectionProps) {
  const [mounted, setMounted] = useState(false);
  const reduceMotionPref = useReducedMotion();
  const reduceMotion =
    !mounted || motionOff || reduceMotionPref === true;

  useEffect(() => {
    setMounted(true);
  }, []);

  if (reduceMotion) {
    return (
      <section id={id} className={className}>
        {children}
      </section>
    );
  }

  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 48 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 90,
        damping: 22,
        mass: 0.85,
        delay,
      }}
      viewport={{ once: true, amount: 0.12, margin: "0px 0px -8% 0px" }}
      className={className}
    >
      {children}
    </motion.section>
  );
}
