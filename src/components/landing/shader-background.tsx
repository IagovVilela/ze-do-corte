"use client";

import { useEffect, useRef } from "react";

import { useReducedMotion } from "framer-motion";

/**
 * Nebula WebGL do Stitch — tint orgânico azul (sem violeta).
 */
export function ShaderBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      powerPreference: "low-power",
    });
    if (!gl) return;

    const syncSize = () => {
      const w = canvas.clientWidth || 1280;
      const h = canvas.clientHeight || 720;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const rw = Math.floor(w * dpr);
      const rh = Math.floor(h * dpr);
      if (canvas.width !== rw || canvas.height !== rh) {
        canvas.width = rw;
        canvas.height = rh;
        gl.viewport(0, 0, rw, rh);
      }
    };

    const ro = new ResizeObserver(syncSize);
    ro.observe(canvas);
    syncSize();

    const vs = `
      attribute vec2 a_position;
      varying vec2 v_texCoord;
      void main() {
        v_texCoord = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;
    const fs = `
      precision highp float;
      varying vec2 v_texCoord;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;

      void main() {
        vec2 uv = v_texCoord;
        vec2 mouse = u_mouse / max(u_resolution, vec2(1.0));
        float t = u_time * 0.2;
        vec2 p = uv * 2.0 - 1.0;
        p.x *= u_resolution.x / max(u_resolution.y, 1.0);

        float strength = 0.0;
        for (float i = 1.0; i < 4.0; i++) {
          p.x += 0.3 / i * sin(i * 3.0 * p.y + t + mouse.x * 2.0);
          p.y += 0.3 / i * cos(i * 3.0 * p.x + t + mouse.y * 2.0);
          strength += abs(0.01 / max(abs(p.y), 0.02));
        }

        vec3 color1 = vec3(0.02, 0.05, 0.12);
        vec3 color2 = vec3(0.06, 0.12, 0.24);
        vec3 accent = vec3(0.18, 0.42, 1.0) * 0.22;

        vec3 finalColor = mix(color1, color2, clamp(strength * 0.45, 0.0, 1.0));
        finalColor += accent * (sin(u_time * 0.5) * 0.5 + 0.5);

        float dist = length(uv - 0.5);
        finalColor *= smoothstep(0.85, 0.2, dist);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };

    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const pos = gl.getAttribLocation(prog, "a_position");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, "u_time");
    const uRes = gl.getUniformLocation(prog, "u_resolution");
    const uMouse = gl.getUniformLocation(prog, "u_mouse");

    let mouse = { x: canvas.width / 2, y: canvas.height / 2 };
    const onMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const nx = (event.clientX - rect.left) / rect.width;
      const ny = 1 - (event.clientY - rect.top) / rect.height;
      mouse = { x: nx * canvas.width, y: ny * canvas.height };
    };
    window.addEventListener("mousemove", onMove, { passive: true });

    let raf = 0;
    const render = (t: number) => {
      gl.uniform1f(uTime, t * 0.001);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      ro.disconnect();
    };
  }, [reduce]);

  if (reduce) {
    return (
      <div
        aria-hidden
        className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_30%_20%,#1a3055_0%,#0f1419_55%)]"
      />
    );
  }

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 opacity-45">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
