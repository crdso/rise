"use client";
import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/components/theme-provider";

/**
 * Luz radial que acompanha o cursor e revela levemente o fundo.
 *
 * Custo: um listener de pointermove e UM rAF. A posição vai direto para
 * CSS custom properties no nó — nenhum setState, nenhum re-render do React,
 * então mover o mouse não repinta a árvore.
 *
 * Desativado em touch (pointer: coarse) e com movimento reduzido.
 */
export function SpotlightSurface({
  className,
  size = 520,
}: {
  className?: string;
  size?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;

    // Só onde existe um ponteiro fino de verdade. Em touch a "luz" ficaria
    // presa no último toque, o que fica estranho.
    const fine = window.matchMedia("(pointer: fine)");
    if (!fine.matches) return;

    const parent = el.parentElement;
    if (!parent) return;

    let raf = 0;
    let x = 0;
    let y = 0;
    let pending = false;

    const flush = () => {
      raf = 0;
      pending = false;
      el.style.setProperty("--sx", `${x}px`);
      el.style.setProperty("--sy", `${y}px`);
    };

    const onMove = (e: PointerEvent) => {
      const rect = parent.getBoundingClientRect();
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
      if (!pending) {
        pending = true;
        raf = requestAnimationFrame(flush);
      }
    };

    const onEnter = () => el.setAttribute("data-active", "true");
    const onLeave = () => el.setAttribute("data-active", "false");

    parent.addEventListener("pointermove", onMove, { passive: true });
    parent.addEventListener("pointerenter", onEnter);
    parent.addEventListener("pointerleave", onLeave);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      parent.removeEventListener("pointermove", onMove);
      parent.removeEventListener("pointerenter", onEnter);
      parent.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced]);

  if (reduced) return null;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-active="false"
      className={`rise-spotlight ${className || ""}`}
      style={{ ["--spotlight-size" as string]: `${size}px` }}
    />
  );
}
