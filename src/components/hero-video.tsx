"use client";

import {
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";

type HeroBackdropVideoProps = {
  scrollTargetRef: React.RefObject<HTMLElement | null>;
  /** URL de imagem/vídeo do tenant. Sem mídia: backdrop genérico (sem vídeo piloto). */
  mediaUrl?: string | null;
};

const MEDIA_CLASS =
  "min-h-full min-w-full h-full w-full object-cover object-[center_30%]";

function isImageUrl(url: string) {
  return /\.(jpe?g|png|gif|webp|avif)(\?|$)/i.test(url) || url.includes("/image/");
}

/**
 * Backdrop do hero: mídia do tenant ou gradiente neutro (nunca fallback de marca piloto).
 */
export function HeroBackdropVideo({
  scrollTargetRef,
  mediaUrl,
}: HeroBackdropVideoProps) {
  const prefersReducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const reduceMotion = mounted && prefersReducedMotion;
  const custom = mediaUrl?.trim() || null;
  const useImage = Boolean(custom && isImageUrl(custom));
  const useVideo = Boolean(custom && !useImage);

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
    if (!el || !useVideo) return;
    if (reduceMotion) {
      el.pause();
      return;
    }
    if (inView) {
      void el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [inView, reduceMotion, useVideo]);

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
        <motion.div
          className="absolute inset-[-8%] origin-center will-change-transform"
          style={
            reduceMotion
              ? { scale: 1, y: 0 }
              : { scale: scaleMotion, y: parallaxMotion }
          }
        >
          {useImage && custom ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={custom} alt="" className={MEDIA_CLASS} decoding="async" />
          ) : useVideo && custom ? (
            <video
              ref={videoRef}
              src={custom}
              className={MEDIA_CLASS}
              muted
              loop
              playsInline
              preload={reduceMotion ? "metadata" : "auto"}
              autoPlay={!reduceMotion}
              controls={false}
              disablePictureInPicture
              aria-label="Mídia institucional da barbearia"
              suppressHydrationWarning
            />
          ) : (
            <div
              className="h-full w-full bg-[radial-gradient(ellipse_80%_60%_at_30%_20%,rgba(196,165,116,0.28),transparent_55%),radial-gradient(ellipse_70%_50%_at_80%_70%,rgba(63,63,70,0.45),transparent_50%),linear-gradient(160deg,#0c0a08,#18181b_55%,#09090b)]"
            />
          )}
        </motion.div>
      </motion.div>

      <div className="absolute inset-0 bg-gradient-to-r from-black/88 via-black/55 to-black/20 md:from-black/90 md:via-black/45 md:to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-black/35" />
      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 90% 60% at 20% 20%, color-mix(in srgb, var(--brand, #c4a574) 40%, transparent), transparent 55%)",
        }}
      />
    </div>
  );
}
