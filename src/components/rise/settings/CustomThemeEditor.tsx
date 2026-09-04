"use client";
import { useEffect, useState } from "react";
import { Plus, Minus, RotateCcw } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { ThemePreview } from "@/components/rise/ThemeSwitcher";
import { CUSTOM_MAX_COLORS, CUSTOM_MIN_COLORS, DEFAULT_CUSTOM, type CustomTheme } from "@/lib/themes";
import { Button } from "@/components/ui/button";

/**
 * Editor do tema personalizado.
 *
 * O usuário escolhe de 2 a 5 cores, a direção do gradiente e a intensidade do
 * ambiente. A luminosidade da base NÃO é editável — é por isso que o tema
 * personalizado não consegue virar claro, por mais claras que sejam as cores.
 *
 * Cada mexida aplica um preview ao vivo; sair sem confirmar restaura o salvo.
 */
export function CustomThemeEditor() {
  const { theme, setTheme, custom, setCustom, resetCustom, previewCustom } = useTheme();
  const [draft, setDraft] = useState<CustomTheme>(custom);

  useEffect(() => setDraft(custom), [custom]);

  // preview ao vivo enquanto o editor está montado
  useEffect(() => {
    if (theme !== "custom") return;
    previewCustom(draft);
    return () => previewCustom(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, theme]);

  const commit = (next: CustomTheme) => {
    setDraft(next);
    setCustom(next);
  };

  const setColor = (i: number, hex: string) => {
    const colors = [...draft.colors];
    colors[i] = hex;
    commit({ ...draft, colors });
  };

  const addColor = () => {
    if (draft.colors.length >= CUSTOM_MAX_COLORS) return;
    commit({ ...draft, colors: [...draft.colors, draft.colors[draft.colors.length - 1] || "#5865F2"] });
  };

  const removeColor = () => {
    if (draft.colors.length <= CUSTOM_MIN_COLORS) return;
    commit({ ...draft, colors: draft.colors.slice(0, -1) });
  };

  const preview: [string, string, string, string] = [
    "#08090C",
    "#12141A",
    draft.colors[0] || DEFAULT_CUSTOM.colors[0],
    draft.colors[1] || draft.colors[0] || DEFAULT_CUSTOM.colors[1],
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-[12px] border border-[var(--border)] bg-[var(--card-soft)] p-3">
        <ThemePreview preview={preview} height={92} />
        <p className="mt-2 text-[11.5px] text-[var(--faint)]">
          A base escura é fixa. Você controla o acento e o ambiente — o RISE nunca vira claro.
        </p>
      </div>

      {/* cores */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-[12.5px] font-medium">
            Cores <span className="text-[var(--faint)]">({draft.colors.length})</span>
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={removeColor}
              disabled={draft.colors.length <= CUSTOM_MIN_COLORS}
              className="h-7 w-7 grid place-items-center rounded-lg border border-[var(--border)] bg-[var(--card-soft)] disabled:opacity-40"
              aria-label="Remover cor"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={addColor}
              disabled={draft.colors.length >= CUSTOM_MAX_COLORS}
              className="h-7 w-7 grid place-items-center rounded-lg border border-[var(--border)] bg-[var(--card-soft)] disabled:opacity-40"
              aria-label="Adicionar cor"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {draft.colors.map((c, i) => (
            <label
              key={i}
              className="relative h-11 w-11 rounded-xl border border-[var(--border)] overflow-hidden cursor-pointer"
              style={{ background: c }}
              title={i === 0 ? "Cor de acento" : `Cor ${i + 1} do ambiente`}
            >
              <input
                type="color"
                value={c}
                onChange={(e) => setColor(i, e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer"
                aria-label={i === 0 ? "Cor de acento" : `Cor ${i + 1}`}
              />
              {i === 0 && (
                <span className="absolute inset-x-0 bottom-0 bg-black/45 text-[8.5px] text-white text-center leading-[13px]">
                  acento
                </span>
              )}
            </label>
          ))}
        </div>
      </div>

      {/* direção */}
      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="angle" className="text-[12.5px] font-medium">
            Direção do gradiente
          </label>
          <span className="text-[11.5px] tnum text-[var(--muted-foreground)]">{draft.angle}°</span>
        </div>
        <input
          id="angle"
          type="range"
          min={0}
          max={360}
          step={5}
          value={draft.angle}
          onChange={(e) => commit({ ...draft, angle: Number(e.target.value) })}
          className="mt-2 w-full accent-[var(--accent)]"
        />
      </div>

      {/* intensidade */}
      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="intensity" className="text-[12.5px] font-medium">
            Intensidade do ambiente
          </label>
          <span className="text-[11.5px] tnum text-[var(--muted-foreground)]">{draft.intensity.toFixed(2)}</span>
        </div>
        <input
          id="intensity"
          type="range"
          min={0.3}
          max={1.4}
          step={0.05}
          value={draft.intensity}
          onChange={(e) => commit({ ...draft, intensity: Number(e.target.value) })}
          className="mt-2 w-full accent-[var(--accent)]"
        />
        <p className="mt-1 text-[11px] text-[var(--faint)]">Vale para todos os temas, não só o personalizado.</p>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        {theme !== "custom" && (
          <Button size="sm" variant="soft" className="rounded-full" onClick={() => setTheme("custom")}>
            Usar tema personalizado
          </Button>
        )}
        <Button size="sm" variant="ghost" className="rounded-full" onClick={resetCustom}>
          <RotateCcw className="h-3.5 w-3.5" /> Restaurar
        </Button>
      </div>
    </div>
  );
}
