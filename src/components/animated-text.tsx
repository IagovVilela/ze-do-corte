"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useState, type CSSProperties } from "react";

/* ────────── Configurações ────────── */

const EASE_CHAR: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Stagger entre caracteres: rápido o bastante para não atrasar, lento para notar. */
const HOVER_STAGGER = 0.018;
const REVEAL_STAGGER = 0.025;

/* ────────── Tipos ────────── */

type AnimatedTextProps = {
  children: string;
  /** Classe CSS para o wrapper <span> externo. */
  className?: string;
  /** Classe CSS aplicada a cada caractere individual. */
  charClassName?: string;
  /**
   * `"hover"`  — anima ao hover (link da navbar, por ex.)
   * `"reveal"` — anima ao entrar na viewport (títulos de seção)
   */
  variant?: "hover" | "reveal";
  /** Elemento HTML a renderizar. Padrão: "span". */
  as?: "span" | "p" | "h1" | "h2" | "h3" | "h4";
  /** Se true, renderiza texto puro sem animação (SSR safe). */
  disabled?: boolean;
  style?: CSSProperties;
};

/* ────────── Variants Framer Motion ────────── */

const hoverCharVariants = {
  rest: {
    y: 0,
    transition: { duration: 0.3, ease: EASE_CHAR },
  },
  hover: {
    y: "-110%",
    transition: { duration: 0.3, ease: EASE_CHAR },
  },
};

const revealCharVariants = {
  hidden: {
    y: "100%",
    opacity: 0,
  },
  visible: (i: number) => ({
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: EASE_CHAR,
      delay: i * REVEAL_STAGGER,
    },
  }),
};

/* ────────── Componente ────────── */

/**
 * Texto animado caractere-a-caractere.
 *
 * - `variant="hover"`: ao hover, cada letra "sobe e sai" com uma cópia
 *   entrando por baixo (efeito roleta vertical). Ideal para links de navbar.
 *
 * - `variant="reveal"`: ao entrar na viewport, cada letra sobe do fundo
 *   em sequência. Ideal para títulos de seção.
 *
 * Respeita `prefers-reduced-motion`.
 */
export function AnimatedText({
  children,
  className,
  charClassName,
  variant = "hover",
  as: Tag = "span",
  disabled,
  style,
}: AnimatedTextProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion || disabled) {
    return (
      <Tag className={className} style={style}>
        {children}
      </Tag>
    );
  }

  if (variant === "hover") {
    return (
      <HoverText className={className} charClassName={charClassName} style={style} tag={Tag}>
        {children}
      </HoverText>
    );
  }

  return (
    <RevealText className={className} charClassName={charClassName} style={style} tag={Tag}>
      {children}
    </RevealText>
  );
}

/* ────────── Hover (roleta vertical) ────────── */

function HoverText({
  children,
  className,
  charClassName,
  style,
  tag: Tag,
}: {
  children: string;
  className?: string;
  charClassName?: string;
  style?: CSSProperties;
  tag: "span" | "p" | "h1" | "h2" | "h3" | "h4";
}) {
  const [hovered, setHovered] = useState(false);
  const onEnter = useCallback(() => setHovered(true), []);
  const onLeave = useCallback(() => setHovered(false), []);

  const chars = children.split("");

  return (
    <motion.span
      className={className}
      style={{
        display: "inline-flex",
        overflow: "hidden",
        position: "relative",
        ...style,
      }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      initial="rest"
      animate={hovered ? "hover" : "rest"}
    >
      {/* Camada original (sai para cima) */}
      <span aria-hidden className="inline-flex">
        {chars.map((char, i) => (
          <motion.span
            key={`top-${i}`}
            className={charClassName}
            variants={hoverCharVariants}
            custom={i}
            transition={{
              duration: 0.3,
              ease: EASE_CHAR,
              delay: i * HOVER_STAGGER,
            }}
            style={{
              display: "inline-block",
              whiteSpace: char === " " ? "pre" : undefined,
            }}
          >
            {char === " " ? "\u00A0" : char}
          </motion.span>
        ))}
      </span>

      {/* Camada clone (entra por baixo) */}
      <span
        aria-hidden
        className="inline-flex"
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        {chars.map((char, i) => (
          <motion.span
            key={`bot-${i}`}
            className={charClassName}
            initial={{ y: "110%" }}
            animate={hovered ? { y: "0%" } : { y: "110%" }}
            transition={{
              duration: 0.3,
              ease: EASE_CHAR,
              delay: i * HOVER_STAGGER,
            }}
            style={{
              display: "inline-block",
              whiteSpace: char === " " ? "pre" : undefined,
            }}
          >
            {char === " " ? "\u00A0" : char}
          </motion.span>
        ))}
      </span>

      {/* Texto real para acessibilidade */}
      <Tag className="sr-only">{children}</Tag>
    </motion.span>
  );
}

/* ────────── Reveal (viewport entry) ────────── */

function RevealText({
  children,
  className,
  charClassName,
  style,
  tag: Tag,
}: {
  children: string;
  className?: string;
  charClassName?: string;
  style?: CSSProperties;
  tag: "span" | "p" | "h1" | "h2" | "h3" | "h4";
}) {
  const words = children.split(" ");

  return (
    <motion.span
      className={className}
      style={{ display: "inline-flex", flexWrap: "wrap", ...style }}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.4 }}
    >
      {words.map((word, wi) => {
        // Calcula offset de caractere acumulado para stagger global
        const prevChars = words.slice(0, wi).reduce((s, w) => s + w.length + 1, 0);

        return (
          <span
            key={`w-${wi}`}
            style={{ display: "inline-flex", overflow: "hidden" }}
          >
            {word.split("").map((char, ci) => (
              <motion.span
                key={`c-${ci}`}
                className={charClassName}
                variants={revealCharVariants}
                custom={prevChars + ci}
                style={{ display: "inline-block" }}
              >
                {char}
              </motion.span>
            ))}
            {wi < words.length - 1 ? (
              <span style={{ display: "inline-block", width: "0.3em" }}>{"\u00A0"}</span>
            ) : null}
          </span>
        );
      })}

      {/* Texto real para screen readers */}
      <Tag className="sr-only">{children}</Tag>
    </motion.span>
  );
}
