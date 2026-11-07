"use client";

import { useEffect, useRef } from "react";

const COLORS = ["#F2B705", "#6F7DD0", "#FFFFFF", "#8FA0FF"];

type Bar = { x: number; w: number; c: string; a: number; v: number; t: number };

/**
 * Le motif « barres de code » en mouvement, derrière le hero et les bandeaux indigo ou encre.
 * Il ne tourne que s'il est visible à l'écran et que l'onglet est affiché ;
 * avec « réduire les animations », les barres restent immobiles.
 */
export function CodeBars({ className = "bars" }: { className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let rows: Array<{ y: number; bars: Bar[] }> = [];
    let W = 0;
    let H = 0;
    let visible = true;
    let running = false;
    let frame = 0;
    let last = performance.now();
    let time = 0;

    const roundRect = (x: number, y: number, w: number, h: number, r: number) => (ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h));

    function size() {
      const box = c!.parentElement!.getBoundingClientRect();
      W = box.width;
      H = box.height;
      c!.width = W * dpr;
      c!.height = H * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      rows = [];
      for (let y = 0, i = 0; y < H; y += 34, i++) {
        const dir = i % 3 === 1 ? -1 : 1;
        const bars: Bar[] = [];
        for (let x = -Math.random() * 300; x < W + 300; ) {
          const w = 60 + Math.random() * 220;
          bars.push({ x, w, c: COLORS[(Math.random() * COLORS.length) | 0], a: 0.25 + Math.random() * 0.55, v: (18 + Math.random() * 42) * dir, t: Math.random() * 6.28 });
          x += w + 40 + Math.random() * 160;
        }
        rows.push({ y, bars });
      }
    }

    function draw(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt;
      ctx!.clearRect(0, 0, W, H);
      for (const row of rows) {
        for (const b of row.bars) {
          if (!reduce) {
            b.x += b.v * dt;
            if (b.v > 0 && b.x > W + 40) b.x = -b.w - 40 - Math.random() * 200;
            if (b.v < 0 && b.x + b.w < -40) b.x = W + 40 + Math.random() * 200;
          }
          const pulse = reduce ? 1 : 0.8 + 0.2 * Math.sin(time * 1.3 + b.t);
          const g = ctx!.createLinearGradient(b.x, 0, b.x + b.w, 0);
          if (b.v > 0) {
            g.addColorStop(0, "rgba(255,255,255,0)");
            g.addColorStop(0.75, b.c);
            g.addColorStop(1, "#FFFFFF");
          } else {
            g.addColorStop(0, "#FFFFFF");
            g.addColorStop(0.25, b.c);
            g.addColorStop(1, "rgba(255,255,255,0)");
          }
          ctx!.globalAlpha = b.a * pulse;
          ctx!.fillStyle = g;
          ctx!.beginPath();
          roundRect(b.x, row.y + 12, b.w, 8, 4);
          ctx!.fill();
          // The glow at the head of the bar.
          ctx!.globalAlpha = b.a * pulse * 0.35;
          ctx!.fillStyle = b.c;
          ctx!.beginPath();
          roundRect((b.v > 0 ? b.x + b.w - 10 : b.x) - 6, row.y + 9, 22, 14, 7);
          ctx!.fill();
        }
      }
      ctx!.globalAlpha = 1;
      if (!reduce && visible && !document.hidden) frame = requestAnimationFrame(draw);
      else running = false;
    }

    function wake() {
      if (running || !visible || document.hidden) return;
      running = true;
      last = performance.now();
      frame = requestAnimationFrame(draw);
    }

    size();
    wake();
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!reduce) wake();
    });
    observer.observe(c.parentElement!);
    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        size();
        if (reduce) draw(performance.now());
      }, 120);
    };
    const onVisibility = () => {
      if (!reduce) wake();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      clearTimeout(resizeTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div className={className} aria-hidden="true">
      <canvas ref={canvas} />
    </div>
  );
}
