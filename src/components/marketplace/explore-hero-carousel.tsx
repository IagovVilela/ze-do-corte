"use client";

import { useEffect, useState } from "react";

const HERO_SLIDES = [
  {
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuA0QXahU78OGP-tT6pLOfDrDUw3-J3i5d1g6zfSFEDz6lW-D3KPhKqj9PDpZ-D098HuS31gRAqTxjJhZxL95nBzDHPd-2e072JQNS6DVlQ9kziRnlDbVfo5YD1Iv-t8IcAuIibzR3t4bZOdT_dGu7UR0i_W0X1WkU6QvzuLdlKU1aSG_egAICEUVsnlf9Cnpw9syBK4sDtSK2K3-kRI1v-Tt3Sivj3PbzvMXWUlu5jXaq9q2J7DAf88njCeZJdEo9cQ4XARNA5PEEo",
    alt: "Corte preciso em barbearia",
  },
  {
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuBsK0Fe_oDlmWiB70oqLN10KgCg1W9qnhayC6PCL8YtO01q21hgSTQ_97XKlQSDpuFwEizkAAUJzPYnXh95mpevsg8oSiXSvvwMZDP_tHrCchXfrLje36_xAXjLeX3QTW3RU54vp6YF6j3HEXKtuME-p_YEBB_pw2raPingpP5ReDOtaLxPk5_uZ9rbAt2nr0uEmrCaDsQhYXinL1y_iy7Y8P9moCE5pVX9zPx5tzsNzFFDKXCQ3qwTEnHqf6ef8ohV5ELe1ALrgiA",
    alt: "Interior de barbearia",
  },
  {
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuBnuQU5ZiOc9k9aSs1frT_tRhs5HjCjjfm15IIPG5SXZaj82rXm3rmpdCevaGoZJzavg5k3uRlyYy8rkHV8RlJg27GmmFjKxVmoZMvkb-zS2pRH9tsz-F8PmskAgqVel33FU7sM83WN7XBMsQ4JxjmmvV_6yJHdwWXbwd3aKqx1uFqkNQS54dZf4PJPNsxjePnf3mjdbZFUEt_6fBfGgvqAhJG7Bb1K62EC_GOk-znP-A4ODQL56Y04fy_ydmYLh9ZcbL27krz50Hg",
    alt: "Ferramentas de barbeiro",
  },
] as const;

const INTERVAL_MS = 6000;

/** Carrossel de fundo do hero do marketplace (Ken Burns). */
export function ExploreHeroCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % HERO_SLIDES.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="explore-hero-carousel absolute inset-0" aria-hidden>
      {HERO_SLIDES.map((slide, i) => (
        <div
          key={slide.src}
          className={`explore-carousel-item${i === index ? " is-active" : ""}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slide.src}
            alt=""
            className="h-full w-full object-cover"
            decoding="async"
          />
        </div>
      ))}
    </div>
  );
}
