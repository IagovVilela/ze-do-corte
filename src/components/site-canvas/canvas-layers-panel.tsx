"use client";

import type { CanvasElement, CanvasElementType } from "@/lib/site-canvas";
import { cn } from "@/lib/utils";

const LAYER_LABEL: Record<CanvasElementType, string> = {
  text: "Texto",
  button: "Botão",
  badge: "Badge",
  divider: "Divisor",
  spacer: "Espaço",
  hero: "Hero",
  panel: "Painel",
  grid: "Grid",
  rect: "Faixa / bloco",
  image: "Imagem",
  media: "Mídia",
  navbar: "Menu",
  services: "Serviços",
  team: "Equipe",
  contact: "Contato",
  footer: "Rodapé",
};

type Props = {
  elements: CanvasElement[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleHidden: (id: string) => void;
  onToggleLock: (id: string) => void;
  onBringFront: (id: string) => void;
  onSendBack: (id: string) => void;
  className?: string;
};

export function CanvasLayersPanel({
  elements,
  selectedId,
  onSelect,
  onToggleHidden,
  onToggleLock,
  onBringFront,
  onSendBack,
  className,
}: Props) {
  const sorted = [...elements].sort(
    (a, b) => b.zIndex - a.zIndex || b.frame.y - a.frame.y,
  );

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col border-[var(--bn-border)] bg-[var(--bn-surface-lowest)]",
        className,
      )}
    >
      <div className="shrink-0 border-b border-[var(--bn-border)] px-3 py-2">
        <p className="text-[11px] font-bold tracking-[0.1em] text-[var(--bn-primary)] uppercase">
          Camadas
        </p>
        <p className="mt-0.5 text-[11px] text-[var(--bn-muted)]">
          Clique para selecionar · frente no topo
        </p>
      </div>
      {sorted.length === 0 ? (
        <p className="px-3 py-4 text-xs text-[var(--bn-muted)]">
          Nenhum elemento nesta tela.
        </p>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto p-2">
          {sorted.map((el) => {
            const active = el.id === selectedId;
            const label = LAYER_LABEL[el.type] ?? el.type;
            return (
              <li key={el.id} className="mb-1">
                <div
                  className={cn(
                    "rounded-lg border px-2 py-1.5 transition",
                    active
                      ? "border-[var(--bn-primary)]/40 bg-[var(--bn-primary-container)]/15"
                      : "border-transparent hover:border-[var(--bn-border)] hover:bg-white/5",
                    el.hidden && "opacity-50",
                  )}
                >
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 text-left"
                    onClick={() => onSelect(el.id)}
                  >
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-[var(--bn-on)]">
                      {label}
                    </span>
                    {el.locked ? (
                      <span className="text-[9px] text-[var(--bn-muted)]">🔒</span>
                    ) : null}
                  </button>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <button
                      type="button"
                      title={el.hidden ? "Mostrar" : "Ocultar"}
                      className="rounded-md border border-[var(--bn-border)] px-1.5 py-0.5 text-[10px] text-[var(--bn-muted)] hover:text-[var(--bn-on)]"
                      onClick={() => onToggleHidden(el.id)}
                    >
                      {el.hidden ? "Mostrar" : "Ocultar"}
                    </button>
                    <button
                      type="button"
                      title={el.locked ? "Desbloquear" : "Bloquear"}
                      className="rounded-md border border-[var(--bn-border)] px-1.5 py-0.5 text-[10px] text-[var(--bn-muted)] hover:text-[var(--bn-on)]"
                      onClick={() => onToggleLock(el.id)}
                    >
                      {el.locked ? "Destravar" : "Travar"}
                    </button>
                    <button
                      type="button"
                      title="Trazer à frente"
                      className="rounded-md border border-[var(--bn-border)] px-1.5 py-0.5 text-[10px] text-[var(--bn-muted)] hover:text-[var(--bn-on)]"
                      onClick={() => onBringFront(el.id)}
                    >
                      Frente
                    </button>
                    <button
                      type="button"
                      title="Enviar para trás"
                      className="rounded-md border border-[var(--bn-border)] px-1.5 py-0.5 text-[10px] text-[var(--bn-muted)] hover:text-[var(--bn-on)]"
                      onClick={() => onSendBack(el.id)}
                    >
                      Trás
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
