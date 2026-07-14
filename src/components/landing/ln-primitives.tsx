"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  animate,
} from "framer-motion";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type MouseEvent,
} from "react";

import { LN_EASE, LN_SPRING } from "@/components/landing/ln-motion";
import { cn } from "@/lib/utils";

export function usePointerGlow() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    const onMove = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduce, x, y]);

  const background = useMotionTemplate`radial-gradient(540px circle at ${x}px ${y}px, rgba(42,245,192,0.12), transparent 42%)`;
  return { background, reduce };
}

export function ScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setP(max > 0 ? window.scrollY / max : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[80] h-[2px] bg-white/5"
      aria-hidden
    >
      <motion.div
        className="h-full origin-left bg-[linear-gradient(90deg,#2af5c0,#7aa2ff)]"
        style={{ scaleX: p }}
      />
    </div>
  );
}

export function DesktopCursor() {
  const reduce = useReducedMotion();
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 500, damping: 40 });
  const sy = useSpring(y, { stiffness: 500, damping: 40 });
  const [hovering, setHovering] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    setEnabled(fine && !reduce);
  }, [reduce]);

  useEffect(() => {
    if (!enabled) return;
    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    const over = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      setHovering(Boolean(t?.closest("a,button,[data-cursor='grow']")));
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerover", over, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerover", over);
    };
  }, [enabled, x, y]);

  if (!enabled) return null;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[90] mix-blend-difference"
      style={{ x: sx, y: sy, translateX: "-50%", translateY: "-50%" }}
    >
      <motion.div
        className="rounded-full border border-white bg-white"
        animate={{
          width: hovering ? 44 : 12,
          height: hovering ? 44 : 12,
          opacity: hovering ? 0.35 : 1,
        }}
        transition={LN_SPRING}
      />
    </motion.div>
  );
}

export function MagneticCta({
  href,
  children,
  tone = "solid",
}: {
  href: string;
  children: ReactNode;
  tone?: "solid" | "ghost" | "light";
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 280, damping: 18 });
  const y = useSpring(my, { stiffness: 280, damping: 18 });
  const reduce = useReducedMotion();
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>(
    [],
  );

  const onMove = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      if (reduce || !ref.current) return;
      const r = ref.current.getBoundingClientRect();
      mx.set((e.clientX - r.left - r.width / 2) * 0.35);
      my.set((e.clientY - r.top - r.height / 2) * 0.35);
    },
    [mx, my, reduce],
  );

  const onLeave = useCallback(() => {
    mx.set(0);
    my.set(0);
  }, [mx, my]);

  const onClick = useCallback((e: MouseEvent<HTMLAnchorElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const id = Date.now();
    setRipples((prev) => [
      ...prev,
      { id, x: e.clientX - r.left, y: e.clientY - r.top },
    ]);
    window.setTimeout(() => {
      setRipples((prev) => prev.filter((p) => p.id !== id));
    }, 700);
  }, []);

  const tones = {
    solid:
      "bg-[#2af5c0] text-[#041016] shadow-[0_0_40px_-10px_rgba(42,245,192,0.7)]",
    ghost: "border border-white/20 bg-white/5 text-[#e8edf7] backdrop-blur-md",
    light: "bg-[#0b1220] text-white shadow-lg shadow-black/10",
  };

  return (
    <motion.div style={{ x, y }} className="inline-flex">
      <Link
        ref={ref}
        href={href}
        data-cursor="grow"
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        onClick={onClick}
        className={cn(
          "relative inline-flex min-h-12 overflow-hidden items-center justify-center rounded-full px-7 text-[13px] font-semibold tracking-wide transition will-change-transform",
          tones[tone],
        )}
      >
        <span className="relative z-10">{children}</span>
        {ripples.map((r) => (
          <motion.span
            key={r.id}
            className="pointer-events-none absolute rounded-full bg-white/40"
            style={{ left: r.x, top: r.y, x: "-50%", y: "-50%" }}
            initial={{ width: 0, height: 0, opacity: 0.5 }}
            animate={{ width: 180, height: 180, opacity: 0 }}
            transition={{ duration: 0.65, ease: LN_EASE }}
          />
        ))}
      </Link>
    </motion.div>
  );
}

export function TiltCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 200, damping: 20 });
  const sry = useSpring(ry, { stiffness: 200, damping: 20 });
  const reduce = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      data-cursor="grow"
      className={cn("relative transform-gpu", className)}
      style={{
        rotateX: srx,
        rotateY: sry,
        transformPerspective: 900,
      }}
      onMouseMove={(e) => {
        if (reduce || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        ry.set((px - 0.5) * 10);
        rx.set((0.5 - py) * 10);
      }}
      onMouseLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

export function ScrambleText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [out, setOut] = useState(text);
  const reduce = useReducedMotion();
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  useEffect(() => {
    if (reduce) {
      setOut(text);
      return;
    }
    let frame = 0;
    const total = 14;
    const id = window.setInterval(() => {
      frame += 1;
      setOut(
        text
          .split("")
          .map((ch, i) => {
            if (ch === " " || ch === ".") return ch;
            if (i < (frame / total) * text.length) return text[i]!;
            return chars[Math.floor(Math.random() * chars.length)]!;
          })
          .join(""),
      );
      if (frame >= total) {
        window.clearInterval(id);
        setOut(text);
      }
    }, 32);
    return () => window.clearInterval(id);
  }, [text, reduce]);

  return <span className={className}>{out}</span>;
}

export function CountUp({
  to,
  suffix = "",
  className,
}: {
  to: number;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let stop: (() => void) | undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        if (reduce) {
          setVal(to);
          return;
        }
        const controls = animate(0, to, {
          duration: 1.4,
          ease: LN_EASE,
          onUpdate: (v) => setVal(Math.round(v)),
        });
        stop = () => controls.stop();
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      stop?.();
    };
  }, [to, reduce]);

  return (
    <span ref={ref} className={className}>
      {val}
      {suffix}
    </span>
  );
}

export function InfiniteMarquee({ items }: { items: string[] }) {
  const doubled = [...items, ...items];
  return (
    <div className="relative overflow-hidden border-y border-white/10 py-4">
      <motion.div
        className="flex w-max gap-10 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 28, ease: "linear", repeat: Infinity }}
      >
        {doubled.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="text-[12px] font-medium tracking-[0.28em] text-white/45 uppercase"
          >
            {item}
            <span className="ml-10 text-[#2af5c0]/70">◆</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}

export function RevealWords({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const words = text.split(" ");
  return (
    <motion.span
      className={cn("inline-flex flex-wrap gap-x-[0.3em]", className)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.6 }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.05 } },
      }}
    >
      {words.map((w, i) => (
        <span key={`${w}-${i}`} className="overflow-hidden inline-block">
          <motion.span
            className="inline-block"
            variants={{
              hidden: { y: "110%" },
              show: { y: "0%", transition: { duration: 0.7, ease: LN_EASE } },
            }}
          >
            {w}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}
