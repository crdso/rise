"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * Layout do painel — preferência de INTERFACE, por dispositivo.
 * Diferente dos stores de dados, este persiste em localStorage nos dois modos
 * (Demo e Supabase): não é dado do usuário, é arrumação de tela, então não
 * viola a separação Demo/Supabase.
 */

export type WidgetId =
  | "spend"
  | "categories"
  | "today"
  | "upcoming"
  | "debts"
  | "important"
  | "school";

/** Ordem padrão: o que importa primeiro é para onde o dinheiro foi. */
export const DEFAULT_WIDGETS: WidgetId[] = [
  "spend",
  "today",
  "categories",
  "upcoming",
  "important",
  "debts",
  "school",
];

export const WIDGET_META: Record<WidgetId, { title: string; desc: string; span: "wide" | "narrow" }> = {
  spend: { title: "Gastos do mês", desc: "Total, comparação e tendência", span: "wide" },
  today: { title: "Hoje", desc: "Eventos e lembretes do dia", span: "narrow" },
  categories: { title: "Categorias", desc: "Para onde o dinheiro foi", span: "narrow" },
  upcoming: { title: "Próximos dias", desc: "O que vem pela frente", span: "narrow" },
  debts: { title: "Dívidas", desc: "Você deve e te devem", span: "narrow" },
  important: { title: "Fixados", desc: "Itens importantes fixados", span: "narrow" },
  school: { title: "Escola", desc: "Próximas entregas e provas", span: "narrow" },
};

type State = {
  order: WidgetId[];
  hidden: WidgetId[];
  /** Sobrescreve o tamanho padrão do widget (só afeta o desktop). */
  spans: Partial<Record<WidgetId, "wide" | "narrow">>;
  editing: boolean;
  _hasHydrated: boolean;
  setHydrated: (v: boolean) => void;
  setOrder: (o: WidgetId[]) => void;
  toggleHidden: (id: WidgetId) => void;
  toggleSpan: (id: WidgetId) => void;
  setEditing: (v: boolean) => void;
  reset: () => void;
};

export const useDashboardStore = create<State>()(
  persist(
    (set) => ({
      order: DEFAULT_WIDGETS,
      hidden: [],
      spans: {},
      editing: false,
      _hasHydrated: false,
      setHydrated: (v) => set({ _hasHydrated: v }),
      setOrder: (order) => set({ order }),
      toggleHidden: (id) =>
        set((s) => ({ hidden: s.hidden.includes(id) ? s.hidden.filter((x) => x !== id) : [...s.hidden, id] })),
      toggleSpan: (id) =>
        set((s) => {
          const current = s.spans[id] ?? WIDGET_META[id].span;
          return { spans: { ...s.spans, [id]: current === "wide" ? "narrow" : "wide" } };
        }),
      setEditing: (editing) => set({ editing }),
      reset: () => set({ order: DEFAULT_WIDGETS, hidden: [], spans: {} }),
    }),
    {
      name: "rise_dashboard_layout_v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ order: s.order, hidden: s.hidden, spans: s.spans }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    }
  )
);

/**
 * Reconcilia a ordem salva com os widgets que existem hoje.
 * Widget novo (lançado depois que o usuário salvou o layout) entra no fim;
 * widget removido some. Sem isso, um layout antigo esconderia recursos novos.
 */
export function resolveOrder(stored: WidgetId[]): WidgetId[] {
  const known = new Set(DEFAULT_WIDGETS);
  const kept = stored.filter((id) => known.has(id));
  const missing = DEFAULT_WIDGETS.filter((id) => !kept.includes(id));
  return [...kept, ...missing];
}
