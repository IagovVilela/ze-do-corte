"use client";

import {
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { HERO_VIDEO_SRC } from "@/lib/constants";

type HeroBackdropVideoProps = {
  scrollTargetRef: React.RefObject<HTMLElement | null>;
};

/** min-h/min-w garantem cobertura mesmo com object-cover + transforms */
const VIDEO_CLASS =
  "min-h-full min-w-full h-full w-full object-cover object-[center_30%]";

/**
 * Vídeo em full-bleed atrás do hero (Framer Motion):
 * - preenche toda a seção, object-cover;
 * - zoom / parallax suave com o scroll da seção;
 * - play quando o hero está visível;
 * - gradientes para contraste do texto;
 * - sem controlos nativos (visual mais limpo).
 *
 * SSR: `useReducedMotion()` pode divergir entre servidor e cliente; só aplicamos
 * o ramo "reduced" após mount para a hidratação coincidir.
 */
export function HeroBackdropVideo({ scrollTargetRef }: HeroBackdropVideoProps) {
  const prefersReducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const reduceMotion = mounted && prefersReducedMotion;

  const videoRef = useRef<HTMLVideoElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(layerRef, { amount: 0.08, margin: "0px" });

  const { scrollYProgress } = useScroll({
    target: scrollTargetRef,
    offset: ["start start", "end start"],
  });

  const scaleMotion = useTransform(scrollYProgress, [0, 0.95], [1, 1.09]);
  const parallaxMotion = useTransform(scrollYProgress, [0, 1], [0, 36]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (reduceMotion) {
      el.pause();
      return;
    }
    if (inView) {
      void el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [inView, reduceMotion]);

  return (
    <div
      ref={layerRef}
      className="pointer-events-none absolute inset-0 z-0 min-h-full overflow-hidden bg-zinc-950"
      aria-hidden
    >
      <motion.div
        className="absolute inset-0"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: 1.1, ease: [0.16, 1, 0.3, 1] }
        }
      >
        {/* Só `inset` negativo: `w-full` aqui quebrava a largura (sobrava faixa à direita). */}
        <motion.div
          className="absolute inset-[-8%] origin-center will-change-transform"
          style={
            reduceMotion
              ? { scale: 1, y: 0 }
              : { scale: scaleMotion, y: parallaxMotion }
          }
        >
          <video
            ref={videoRef}
            src={HERO_VIDEO_SRC}
            className={VIDEO_CLASS}
            muted
            loop
            playsInline
            preload={reduceMotion ? "metadata" : "auto"}
            autoPlay={!reduceMotion}
            controls={false}
            disablePictureInPicture
            aria-label="Vídeo institucional da barbearia Zé do Corte"
            suppressHydrationWarning
          />
        </motion.div>
      </motion.div>

      {/* Leitura do texto à esquerda + profundidade */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/88 via-black/55 to-black/20 md:from-black/90 md:via-black/45 md:to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-black/35" />
      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 90% 60% at 20% 20%, rgba(250,204,21,0.12), transparent 55%)",
        }}
      />
    </div>
  );
}
