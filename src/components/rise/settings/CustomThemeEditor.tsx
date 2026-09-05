"use client";
import { useEffect, useState } from "react";
import { Check, Plus, RotateCcw, X } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import {
  buildCustomTheme,
  CUSTOM_GRADIENT_PRESETS,
  CUSTOM_MAX_COLORS,
  CUSTOM_MIN_COLORS,
  DEFAULT_CUSTOM,
  normalizeCustomTheme,
  type CustomTheme,
} from "@/lib/themes";
import { Button } from "@/components/ui/button";

const HEX = /^#[0-9a-fA-F]{6}$/;
const EXTRA_COLORS = ["#007C87", "#5B21B6", "#950909"];

function ColorStop({
  color,
  index,
  removable,
  onChange,
  onRemove,
}: {
  color: string;
  index: number;
  removable: boolean;
  onChange: (color: string) => void;
  onRemove: () => void;
}) {
  const [hex, setHex] = useState(color);
  useEffect(() => setHex(color), [color]);

  const commitHex = (value: string) => {
    if (HEX.test(value)) onChange(value.toUpperCase());
    else setHex(color);
  };

  return (
    <div className="flex min-w-[132px] items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card-soft)] p-1.5">
      <label
        className="relative grid h-9 w-9 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-lg border border-white/10"
        style={{ background: color }}
        title={`Escolher cor ${index + 1}`}
      >
        <input
          type="color"
          value={color}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label={`Color picker da cor ${index + 1}`}
        />
      </label>
      <input
        value={hex}
        onChange={(event) => {
          const value = event.target.value.toUpperCase();
          setHex(value);
          if (HEX.test(value)) onChange(value);
        }}
        onBlur={() => commitHex(hex)}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        aria-label={`Hexadecimal da cor ${index + 1}`}
        className="min-w-0 flex-1 bg-transparent text-[12px] font-medium uppercase text-[var(--foreground)] outline-none placeholder:text-[var(--faint)]"
      />
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          aria-label={`Remover cor ${index + 1}`}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function CustomThemeEditor() {
  const { theme, setTheme, custom, setCustom, resetCustom, previewCustom } = useTheme();
  const [draft, setDraft] = useState<CustomTheme>(custom);

  useEffect(() => setDraft(custom), [custom]);

  // Preview sem espera: cada controle aplica os tokens no documento inteiro.
  useEffect(() => {
    if (theme !== "custom") return;
    previewCustom(draft);
    return () => previewCustom(null);
  }, [draft, theme, previewCustom]);

  const commit = (next: CustomTheme) => {
    const normalized = normalizeCustomTheme(next);
    setDraft(normalized);
    if (theme !== "custom") setTheme("custom");
    setCustom(normalized);
  };

  const setColor = (index: number, color: string) => {
    const colors = [...draft.colors];
    colors[index] = color;
    commit({ ...draft, colors, presetId: null });
  };

  const addColor = () => {
    if (draft.colors.length >= CUSTOM_MAX_COLORS) return;
    const next = EXTRA_COLORS[draft.colors.length - CUSTOM_MIN_COLORS] || draft.colors[draft.colors.length - 1];
    commit({ ...draft, colors: [...draft.colors, next], presetId: null });
  };

  const removeColor = (index: number) => {
    if (draft.colors.length <= CUSTOM_MIN_COLORS) return;
    commit({ ...draft, colors: draft.colors.filter((_, colorIndex) => colorIndex !== index), presetId: null });
  };

  const tokens = buildCustomTheme(draft);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[14px] font-semibold">Personalize seu tema</p>
        <p className="mt-1 text-[12px] text-[var(--muted-foreground)]">
          Gradientes influenciam o ambiente e as superfícies sem comprometer a base escura.
        </p>
      </div>

      <div className="overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--card-soft)] p-2">
        <div className="relative h-[112px] overflow-hidden rounded-[11px]" style={{ background: tokens["--theme-gradient"] }}>
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(3,5,9,0.68),transparent_62%)]" />
          <div className="absolute inset-x-4 top-4 flex items-center justify-between">
            <span className="h-2 w-16 rounded-full bg-white/80" />
            <span className="h-5 w-5 rounded-full border border-white/30 bg-black/20" />
          </div>
          <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-white/15 bg-black/35 p-2.5 backdrop-blur-sm">
            <span className="block h-1.5 w-20 rounded-full bg-white/70" />
            <span className="mt-2 block h-1 w-3/5 rounded-full bg-white/35" />
          </div>
        </div>
      </div>

      <section aria-labelledby="custom-theme-colors">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <h3 id="custom-theme-colors" className="text-[12.5px] font-medium uppercase tracking-[0.06em] text-[var(--faint)]">Cores</h3>
            <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">Stops distribuídos automaticamente.</p>
          </div>
          <span className="text-[11px] tnum text-[var(--faint)]">{draft.colors.length}/{CUSTOM_MAX_COLORS}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {draft.colors.map((color, index) => (
            <ColorStop
              key={`${color}-${index}`}
              color={color}
              index={index}
              removable={draft.colors.length > CUSTOM_MIN_COLORS}
              onChange={(next) => setColor(index, next)}
              onRemove={() => removeColor(index)}
            />
          ))}
          <button
            type="button"
            onClick={addColor}
            disabled={draft.colors.length >= CUSTOM_MAX_COLORS}
            className="inline-flex h-12 items-center gap-1.5 rounded-xl border border-dashed border-[var(--border-strong)] px-3 text-[12px] font-medium text-[var(--muted-foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar cor
          </button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2" aria-label="Controles do gradiente">
        <div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="custom-theme-angle" className="text-[12.5px] font-medium">Direção do gradiente</label>
            <output htmlFor="custom-theme-angle" className="text-[12px] tnum text-[var(--muted-foreground)]">{draft.angle}°</output>
          </div>
          <input
            id="custom-theme-angle"
            type="range"
            min={0}
            max={360}
            step={1}
            value={draft.angle}
            onChange={(event) => commit({ ...draft, angle: Number(event.target.value), presetId: null })}
            className="mt-3 h-2 w-full cursor-pointer accent-[var(--accent)]"
          />
          <div className="mt-1 flex justify-between text-[10.5px] text-[var(--faint)]"><span>0°</span><span>360°</span></div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="custom-theme-intensity" className="text-[12.5px] font-medium">Intensidade da cor</label>
            <output htmlFor="custom-theme-intensity" className="text-[12px] tnum text-[var(--muted-foreground)]">{draft.intensity}%</output>
          </div>
          <input
            id="custom-theme-intensity"
            type="range"
            min={0}
            max={100}
            step={1}
            value={draft.intensity}
            onChange={(event) => commit({ ...draft, intensity: Number(event.target.value), presetId: null })}
            className="mt-3 h-2 w-full cursor-pointer accent-[var(--accent)]"
          />
          <div className="mt-1 flex justify-between text-[10.5px] text-[var(--faint)]"><span>0%</span><span>100%</span></div>
        </div>
      </section>

      <section aria-labelledby="custom-theme-presets">
        <div className="mb-2">
          <h3 id="custom-theme-presets" className="text-[12.5px] font-medium uppercase tracking-[0.06em] text-[var(--faint)]">Temas</h3>
          <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">Presets escuros prontos para usar.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {CUSTOM_GRADIENT_PRESETS.map((preset) => {
            const selected = draft.presetId === preset.id;
            const gradient = buildCustomTheme({ ...preset, presetId: preset.id })["--theme-gradient"];
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => commit({ ...preset, presetId: preset.id })}
                aria-label={`Aplicar ${preset.label}`}
                aria-pressed={selected}
                title={preset.label}
                className={`group relative aspect-[1.35] overflow-hidden rounded-lg border transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                  selected ? "border-[var(--accent)] ring-1 ring-[var(--accent)]" : "border-[var(--border)] hover:border-[var(--border-strong)]"
                }`}
                style={{ background: gradient }}
              >
                <span className="absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.12),transparent_55%)]" />
                {selected && <span className="absolute right-1.5 top-1.5 grid h-4 w-4 place-items-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)]"><Check className="h-2.5 w-2.5" /></span>}
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
        {theme !== "custom" && (
          <Button size="sm" variant="soft" className="rounded-full" onClick={() => setTheme("custom")}>
            Usar tema personalizado
          </Button>
        )}
        <Button size="sm" variant="ghost" className="rounded-full" onClick={() => resetCustom()}>
          <RotateCcw className="h-3.5 w-3.5" /> Restaurar
        </Button>
      </div>
    </div>
  );
}
