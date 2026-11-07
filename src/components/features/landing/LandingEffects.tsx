"use client";

import { useEffect } from "react";

/**
 * Les effets de la landing page, branchés sur le HTML rendu par le serveur :
 * - le titre du hero apparaît ligne par ligne, puis les cartes ;
 * - les sections apparaissent au défilement (.rv, .rv-stagger) ;
 * - les cartes du hero suivent la souris, et le bouton principal est « magnétique » (souris seulement).
 * Sans JavaScript, ou avec « réduire les animations », tout est visible et immobile.
 */
export function LandingEffects() {
  useEffect(() => {
    const root = document.getElementById("lp");
    const hero = document.getElementById("hero");
    if (!root || !hero) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mouse = window.matchMedia("(pointer: fine)").matches;
    root.classList.add("js");
    const cleanups: Array<() => void> = [];

    const timers = [
      setTimeout(() => hero.classList.add("in"), 80),
      setTimeout(() => hero.classList.add("float"), 1380),
    ];

    const targets = root.querySelectorAll(".rv, .rv-stagger");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );
    targets.forEach((el) => io.observe(el));
    // Safety net: nothing stays hidden if the observer never fires (print, odd browsers).
    timers.push(setTimeout(() => targets.forEach((el) => el.classList.add("in")), 3500));
    cleanups.push(() => io.disconnect());

    if (!reduce && mouse) {
      const cards = hero.querySelectorAll<HTMLElement>(".card");
      let raf = 0;
      let mx = 0;
      let my = 0;
      const apply = () => {
        raf = 0;
        if (!hero.classList.contains("float")) return;
        cards.forEach((card) => {
          const depth = Number(card.dataset.depth) || 10;
          card.style.transform = `translate3d(${-mx * depth}px, ${-my * depth}px, 0) rotateY(${mx * 4}deg) rotateX(${-my * 4}deg)`;
        });
      };
      const onMove = (e: MouseEvent) => {
        const r = hero.getBoundingClientRect();
        mx = (e.clientX - r.left) / r.width - 0.5;
        my = (e.clientY - r.top) / r.height - 0.5;
        if (!raf) raf = requestAnimationFrame(apply);
      };
      const onLeave = () => {
        mx = 0;
        my = 0;
        if (!raf) raf = requestAnimationFrame(apply);
      };
      hero.addEventListener("mousemove", onMove);
      hero.addEventListener("mouseleave", onLeave);
      cleanups.push(() => {
        hero.removeEventListener("mousemove", onMove);
        hero.removeEventListener("mouseleave", onLeave);
        cancelAnimationFrame(raf);
      });

      root.querySelectorAll<HTMLElement>(".btn--sun").forEach((b) => {
        const move = (e: MouseEvent) => {
          const r = b.getBoundingClientRect();
          b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px, ${(e.clientY - r.top - r.height / 2) * 0.28}px)`;
        };
        const leave = () => (b.style.transform = "");
        b.addEventListener("mousemove", move);
        b.addEventListener("mouseleave", leave);
        cleanups.push(() => {
          b.removeEventListener("mousemove", move);
          b.removeEventListener("mouseleave", leave);
        });
      });
    }

    return () => {
      timers.forEach(clearTimeout);
      cleanups.forEach((f) => f());
    };
  }, []);
  return null;
}
