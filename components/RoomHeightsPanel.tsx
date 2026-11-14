"use client";

/**
 * Ceiling heights — one room or several at once. Shown over the 3D view.
 * Pick rooms (or "All"), type a height, Apply. Walls, ceilings, ceiling
 * lights and fans follow (lib/walls/heights).
 */

import React, { useState } from "react";
import { X, Check } from "lucide-react";
import { DEFAULT_CEILING_M, MAX_CEILING_M, MIN_CEILING_M, cleanCeiling } from "@/lib/walls/heights";

export interface HeightRoomRow { id: string; name: string; color?: string; height?: number | null }

export default function RoomHeightsPanel({ rooms, onApply, onClose, saving = false }: {
  rooms: HeightRoomRow[];
  onApply: (ids: string[], metres: number) => void;
  onClose: () => void;
  saving?: boolean;
}) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [value, setValue] = useState("");
  const all = rooms.length > 0 && picked.size === rooms.length;
  const toggle = (id: string) => setPicked(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const h = Number(value);
  const valid = value.trim() !== "" && Number.isFinite(h) && h >= MIN_CEILING_M && h <= MAX_CEILING_M;

  return (
    <div className="mb-2 w-[260px] rounded-[12px] bg-black/75 p-3.5 text-white backdrop-blur-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] font-semibold">Ceiling heights</span>
        <button onClick={onClose} title="Done" className="text-white/60 hover:text-white"><X size={14} /></button>
      </div>
      {rooms.length === 0 ? (
        <p className="text-[11px] text-white/65">This plan has no rooms yet.</p>
      ) : (
        <>
          <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wide text-white/45">
            <span>Rooms</span>
            <button onClick={() => setPicked(all ? new Set() : new Set(rooms.map(r => r.id)))}
              className="normal-case tracking-normal text-white/70 hover:text-white">{all ? "Clear" : "Select all"}</button>
          </div>
          <div className="max-h-[220px] space-y-0.5 overflow-y-auto pe-0.5">
            {rooms.map(r => {
              const on = picked.has(r.id);
              const cur = cleanCeiling(r.height) ?? DEFAULT_CEILING_M;
              return (
                <button key={r.id} onClick={() => toggle(r.id)} aria-pressed={on}
                  className={`flex w-full items-center gap-2 rounded-[7px] px-2 py-1.5 text-left text-[11.5px] transition-colors ${on ? "bg-white/20" : "hover:bg-white/10"}`}>
                  <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] border ${on ? "border-[#c7de7d] bg-[#c7de7d] text-[#0a0a0a]" : "border-white/40"}`}>
                    {on && <Check size={10} strokeWidth={3} />}
                  </span>
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: r.color ?? "#999" }} />
                  <span className="min-w-0 flex-1 truncate">{r.name}</span>
                  <span className="shrink-0 text-white/60">{cur.toFixed(2)} m</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <input
              type="number" min={MIN_CEILING_M} max={MAX_CEILING_M} step={0.05}
              value={value} onChange={e => setValue(e.target.value)}
              onKeyDown={e => { e.stopPropagation(); if (e.key === "Enter" && valid && picked.size) onApply([...picked], h); }}
              placeholder="e.g. 3.00"
              className="w-[78px] rounded-[6px] bg-white/10 px-2 py-1.5 text-right text-[12px] text-white outline-none focus:bg-white/20"
            />
            <span className="text-[11px] text-white/60">m</span>
            <button
              disabled={!valid || picked.size === 0 || saving}
              onClick={() => onApply([...picked], h)}
              className="ms-auto rounded-[7px] bg-[#c7de7d] px-2.5 py-1.5 text-[11px] font-semibold text-[#0a0a0a] disabled:opacity-40"
            >
              {saving ? "Saving…" : picked.size > 1 ? `Apply to ${picked.size}` : "Apply"}
            </button>
          </div>
          <p className="mt-2 text-[10.5px] leading-snug text-white/50">
            {MIN_CEILING_M.toFixed(1)}–{MAX_CEILING_M.toFixed(0)} m. A wall between two rooms takes the taller height.
          </p>
        </>
      )}
    </div>
  );
}
