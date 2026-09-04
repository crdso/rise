"use client";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { usePrefersReducedMotion } from "@/components/theme-provider";

/**
 * Conclusão do login: quatro pontos orbitando convergem para o centro,
 * a cor migra para verde e forma-se o check. ~900ms no total.
 * Com movimento reduzido, mostra o estado final direto.
 */
export function LoginSuccess({ label = "Bem-vindo de volta." }: { label?: string }) {
  const reduced = usePrefersReducedMotion();
  const R = 34;
  const dots = [0, 1, 2, 3];

  return (
    <div className="py-10 text-center" role="status" aria-live="polite">
      <div className="relative mx-auto h-[88px] w-[88px]">
        {!reduced &&
          dots.map((i) => {
            const angle = ((i * 90 + 45) * Math.PI) / 180;
            return (
              <motion.span
                key={i}
                className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full"
                initial={{
                  x: Math.cos(angle) * R - 4,
                  y: Math.sin(angle) * R - 4,
                  backgroundColor: "var(--accent)",
                  opacity: 0.9,
                  scale: 1,
                }}
                animate={{
                  x: -4,
                  y: -4,
                  backgroundColor: "#22C55E",
                  opacity: [0.9, 1, 0],
                  scale: [1, 1.15, 0.4],
                }}
                transition={{ duration: 0.62, delay: 0.06 * i, ease: [0.22, 1, 0.36, 1] }}
                style={{ boxShadow: "0 0 12px currentColor" }}
              />
            );
          })}

        {/* anel de glow que fecha junto com a convergência */}
        <motion.span
          className="absolute inset-0 rounded-full border"
          initial={reduced ? { opacity: 0.35, scale: 1 } : { opacity: 0, scale: 0.6, borderColor: "var(--accent)" }}
          animate={{ opacity: [0, 0.5, 0], scale: [0.6, 1.25, 1.5], borderColor: "#22C55E" }}
          transition={{ duration: 0.8, delay: 0.35, ease: "easeOut" }}
        />

        <motion.div
          className="absolute inset-0 grid place-items-center"
          initial={reduced ? { scale: 1, opacity: 1 } : { scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: reduced ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="h-12 w-12 rounded-full bg-emerald-500 text-white grid place-items-center shadow-[0_0_28px_rgba(34,197,94,0.5)]">
            <Check className="h-6 w-6" strokeWidth={3} />
          </span>
        </motion.div>
      </div>

      <motion.div
        initial={reduced ? { opacity: 1 } : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reduced ? 0 : 0.68, duration: 0.3 }}
        className="mt-4"
      >
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Abrindo o painel…</p>
      </motion.div>
    </div>
  );
}
