"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@astracode/ui";

export function MotionCard({
  children,
  className,
  delay = 0,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "li";
}) {
  const reduce = useReducedMotion();
  const Comp = as === "li" ? motion.li : motion.div;

  return (
    <Comp
      className={cn("will-change-transform", className)}
      initial={reduce ? false : { opacity: 0, y: 26, scale: 0.985 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={reduce ? undefined : { y: -4, scale: 1.012 }}
    >
      {children}
    </Comp>
  );
}
