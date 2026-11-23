"use client";

import * as React from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

export function LandingMotion() {
  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({ duration: 1.1, smoothWheel: true, touchMultiplier: 1.4 });
    const update = () => ScrollTrigger.update();
    lenis.on("scroll", update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const headings = Array.from(document.querySelectorAll<HTMLElement>("[data-word-reveal]"));
    const restores: Array<() => void> = [];
    const tweens: gsap.core.Tween[] = [];

    for (const heading of headings) {
      if (heading.dataset.wordsplit === "true") continue;
      const original = heading.innerHTML;
      const words = (heading.textContent ?? "").trim().split(/\s+/).filter(Boolean);
      if (words.length < 2) continue;

      heading.dataset.wordsplit = "true";
      heading.textContent = "";

      for (const word of words) {
        const mask = document.createElement("span");
        mask.style.display = "inline-block";
        mask.style.overflow = "hidden";
        mask.style.verticalAlign = "bottom";
        const inner = document.createElement("span");
        inner.style.display = "inline-block";
        inner.textContent = word;
        mask.appendChild(inner);
        heading.appendChild(mask);
        heading.appendChild(document.createTextNode(" "));
        tweens.push(
          gsap.fromTo(
            inner,
            { yPercent: 115, opacity: 0 },
            {
              yPercent: 0,
              opacity: 1,
              duration: 0.8,
              ease: "power3.out",
              scrollTrigger: { trigger: heading, start: "top 84%", once: true },
            },
          ),
        );
      }
      restores.push(() => {
        heading.innerHTML = original;
        delete heading.dataset.wordsplit;
      });
    }

    ScrollTrigger.refresh();

    return () => {
      for (const tween of tweens) tween.kill();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
      gsap.ticker.remove(tick);
      lenis.off("scroll", update);
      lenis.destroy();
      restores.forEach((restore) => restore());
    };
  }, []);

  return null;
}
