"use client";

/**
 * Show / hide over the 3D view: lighting, a category, a type (all sofas), the
 * kitchen, or single pieces. Rules in lib/scene/visibility.
 */

import React from "react";
import { X, Eye, EyeOff } from "lucide-react";
import type { HiddenSet, VisibilityRow } from "@/lib/scene/visibility";

function Row({ row, hidden, onToggle }: { row: VisibilityRow; hidden: boolean; onToggle: () => void }) {
  const partly = !hidden && row.hidden > 0;
  return (
    <button onClick={onToggle} aria-pressed={!hidden}
      className="flex w-full items-center gap-2 rounded-[7px] px-2 py-1.5 text-left text-[11.5px] hover:bg-white/10">
      {hidden ? <EyeOff size={13} className="shrink-0 text-white/45" /> : <Eye size={13} className="shrink-0 text-white/85" />}
      <span className={`min-w-0 flex-1 truncate ${hidden ? "text-white/45 line-through" : ""}`}>{row.label}</span>
      <span className="shrink-0 text-white/50">{partly ? `${row.count - row.hidden}/${row.count}` : row.count}</span>
    </button>
  );
}

export default function VisibilityPanel({
  groups, types, hidden, hasKitchen, hiddenPieces,
  onGroup, onType, onKitchen, onPiece, onShowAll, onClose,
}: {
  groups: VisibilityRow[];
  types: VisibilityRow[];
  hidden: HiddenSet;
  hasKitchen: boolean;
  /** single pieces hidden one by one */
  hiddenPieces: { id: string; name: string }[];
  onGroup: (key: string) => void;
  onType: (key: string) => void;
  onKitchen: () => void;
  onPiece: (id: string) => void;
  onShowAll: () => void;
  onClose: () => void;
}) {
  const anything = groups.length > 0 || hasKitchen;
  const anyHidden = hidden.groups.length || hidden.types.length || hidden.items.length || hidden.kitchen;
  return (
    <div className="mb-2 w-[250px] max-h-[60vh] overflow-y-auto rounded-[12px] bg-black/75 p-3.5 text-white backdrop-blur-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] font-semibold">Show / hide</span>
        <div className="flex items-center gap-2">
          {anyHidden ? <button onClick={onShowAll} className="text-[10.5px] text-[#c7de7d] hover:underline">Show all</button> : null}
          <button onClick={onClose} title="Done" className="text-white/60 hover:text-white"><X size={14} /></button>
        </div>
      </div>
      {!anything ? (
        <p className="text-[11px] text-white/65">Add furniture to the room first.</p>
      ) : (
        <>
          {(groups.length > 0 || hasKitchen) && (
            <div className="mb-2">
              <div className="mb-0.5 text-[10px] uppercase tracking-wide text-white/45">Groups</div>
              {groups.map(g => <Row key={g.key} row={g} hidden={hidden.groups.includes(g.key)} onToggle={() => onGroup(g.key)} />)}
              {hasKitchen && (
                <Row row={{ key: "kitchen", label: "Kitchen cabinets", count: 1, hidden: hidden.kitchen ? 1 : 0 }}
                  hidden={!!hidden.kitchen} onToggle={onKitchen} />
              )}
            </div>
          )}
          {types.length > 0 && (
            <div className="mb-2">
              <div className="mb-0.5 text-[10px] uppercase tracking-wide text-white/45">Types</div>
              {types.map(t => <Row key={t.key} row={t} hidden={hidden.types.includes(t.key)} onToggle={() => onType(t.key)} />)}
            </div>
          )}
          {hiddenPieces.length > 0 && (
            <div>
              <div className="mb-0.5 text-[10px] uppercase tracking-wide text-white/45">Hidden pieces</div>
              {hiddenPieces.map(p => (
                <button key={p.id} onClick={() => onPiece(p.id)}
                  className="flex w-full items-center gap-2 rounded-[7px] px-2 py-1.5 text-left text-[11.5px] hover:bg-white/10">
                  <EyeOff size={13} className="shrink-0 text-white/45" />
                  <span className="min-w-0 flex-1 truncate text-white/60">{p.name}</span>
                  <span className="shrink-0 text-[10.5px] text-[#c7de7d]">Show</span>
                </button>
              ))}
            </div>
          )}
          <p className="mt-1 text-[10.5px] leading-snug text-white/50">
            Hidden pieces stay in the design and the shopping list. To hide one piece, select it and choose &ldquo;Hide&rdquo;.
          </p>
        </>
      )}
    </div>
  );
}
