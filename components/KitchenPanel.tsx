"use client";

/**
 * Kitchen builder panel — components/KitchenPanel.tsx
 * ============================================================================
 * Shown over the 3D view while "Kitchen" is on: units to add, the selected
 * unit's controls, and the kitchen's style. The page owns the data and does
 * the edits (lib/kitchen/model); this is the controls.
 */

import React from "react";
import { X, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { MODULES, type KitchenData, type ModuleKind, type UpperKind } from "@/lib/kitchen/model";
import { COUNTERTOPS, FRONT_FINISHES, HARDWARE, type KitchenStyle } from "@/lib/kitchen/materials";
import type { KitchenSelection } from "@/components/KitchenLayer";
import KitchenEstimate from "@/components/KitchenEstimate";

interface Props {
  data: KitchenData;
  addKind: ModuleKind | null;
  onAddKind: (k: ModuleKind | null) => void;
  selected: KitchenSelection | null;
  onStyle: (s: KitchenStyle) => void;
  onWidth: (cm: number) => void;
  onReplace: (k: ModuleKind) => void;
  onUpper: (u: UpperKind) => void;
  onMove: (by: -1 | 1) => void;
  onInsert: (side: "left" | "right") => void;
  onRemove: () => void;
  onRemoveRun: () => void;
  onClose: () => void;
}

const KINDS = Object.keys(MODULES) as ModuleKind[];

const chip = (on: boolean) =>
  `rounded-[6px] px-2 py-1 text-[10.5px] font-medium transition-colors ${on ? "bg-white text-[#0a0a0a]" : "bg-white/10 text-white/80 hover:bg-white/20"}`;

export default function KitchenPanel(p: Props) {
  const { data, selected } = p;
  const run = selected ? data.runs.find(r => r.id === selected.runId) : undefined;
  const mod = run && selected ? run.modules[selected.index] : undefined;
  const info = mod ? MODULES[mod.kind] : undefined;
  const style = data.style;
  const set = (patch: Partial<KitchenStyle>) => p.onStyle({ ...style, ...patch });
  const units = data.runs.reduce((a, r) => a + r.modules.length, 0);

  return (
    <div className="mb-2 w-[268px] max-h-[62vh] overflow-y-auto rounded-[12px] bg-black/75 backdrop-blur-sm p-3.5 text-white">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] font-semibold">Kitchen</span>
        <button onClick={p.onClose} title="Done" className="text-white/60 hover:text-white"><X size={14} /></button>
      </div>

      {/* ── add ── */}
      {(["Cabinets", "Appliances"] as const).map(group => (
        <div key={group} className="mb-2">
          <div className="mb-1 text-[10px] uppercase tracking-wide text-white/45">{group}</div>
          <div className="grid grid-cols-2 gap-1">
            {KINDS.filter(k => MODULES[k].group === group).map(k => (
              <button key={k} onClick={() => p.onAddKind(p.addKind === k ? null : k)}
                className={`flex items-center gap-1 rounded-[7px] px-2 py-1.5 text-left text-[11px] ${p.addKind === k ? "bg-[#c7de7d] text-[#0a0a0a]" : "bg-white/10 text-white/85 hover:bg-white/20"}`}>
                <Plus size={11} className="shrink-0" />{MODULES[k].label}
              </button>
            ))}
          </div>
        </div>
      ))}
      <p className="mb-3 text-[10.5px] leading-snug text-white/55">
        {p.addKind
          ? `Click a wall to place the ${MODULES[p.addKind].label.toLowerCase()} — next to a run to extend it. Esc to stop.`
          : units === 0 ? "Pick a unit, then click a wall to start your kitchen." : "Click a unit in 3D to change it."}
      </p>

      {/* ── the selected unit ── */}
      {mod && info && (
        <div className="mb-3 space-y-2 rounded-[9px] bg-white/[0.06] p-2.5">
          <div className="text-[11.5px] font-semibold">{info.label}</div>
          <label className="flex items-center justify-between text-[11px] text-white/75">
            Width
            <select value={Math.round(mod.width * 100)} onChange={e => p.onWidth(Number(e.target.value))}
              className="rounded-[6px] bg-white/10 px-1.5 py-1 text-[11px] text-white">
              {[...new Set([...info.widths.map(w => Math.round(w * 100)), Math.round(mod.width * 100)])].sort((a, b) => a - b)
                .map(cm => <option key={cm} value={cm} className="text-black">{cm} cm</option>)}
            </select>
          </label>
          <label className="flex items-center justify-between text-[11px] text-white/75">
            Replace with
            <select value={mod.kind} onChange={e => p.onReplace(e.target.value as ModuleKind)}
              className="max-w-[140px] rounded-[6px] bg-white/10 px-1.5 py-1 text-[11px] text-white">
              {KINDS.map(k => <option key={k} value={k} className="text-black">{MODULES[k].label}</option>)}
            </select>
          </label>
          {!info.tall && (
            <div className="flex items-center justify-between text-[11px] text-white/75">
              Above it
              <div className="flex gap-0.5">
                {([["cabinet", "Cabinet"], ["hood", "Hood"], [null, "Nothing"]] as [UpperKind, string][]).map(([u, l]) => (
                  <button key={String(u)} onClick={() => p.onUpper(u)} className={chip(mod.upper === u)}>{l}</button>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-4 gap-1">
            <button onClick={() => p.onMove(-1)} title="Swap with the unit on its left" className={chip(false)}><ChevronLeft size={12} className="mx-auto" /></button>
            <button onClick={() => p.onMove(1)} title="Swap with the unit on its right" className={chip(false)}><ChevronRight size={12} className="mx-auto" /></button>
            <button onClick={() => p.onInsert("left")} title="Add a base cabinet on its left" className={chip(false)}>+ Left</button>
            <button onClick={() => p.onInsert("right")} title="Add a base cabinet on its right" className={chip(false)}>+ Right</button>
          </div>
          <div className="flex gap-1">
            <button onClick={p.onRemove} className="flex flex-1 items-center justify-center gap-1 rounded-[7px] border border-white/20 py-1 text-[10.5px] text-white/80 hover:bg-red-500/80">
              <Trash2 size={11} />Delete unit
            </button>
            <button onClick={p.onRemoveRun} className="flex-1 rounded-[7px] border border-white/20 py-1 text-[10.5px] text-white/60 hover:bg-red-500/80 hover:text-white">
              Delete whole run
            </button>
          </div>
        </div>
      )}

      {/* ── style (whole kitchen) ── */}
      <div className="space-y-2.5">
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wide text-white/45">Door style</div>
          <div className="grid grid-cols-3 gap-0.5 rounded-[8px] bg-white/10 p-0.5">
            {([["slab", "Flat"], ["shaker", "Shaker"], ["raised-arch", "Arched"]] as const).map(([id, l]) => (
              <button key={id} onClick={() => set({ frontStyle: id })}
                className={`rounded-[6px] py-1 text-[11px] ${style.frontStyle === id ? "bg-white text-[#0a0a0a]" : "text-white/70 hover:text-white"}`}>{l}</button>
            ))}
          </div>
        </div>
        <Swatches title="Cabinet colour" items={FRONT_FINISHES} value={style.front} onPick={id => set({ front: id })} />
        <Swatches title="Countertop" items={COUNTERTOPS} value={style.countertop} onPick={id => set({ countertop: id })} />
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wide text-white/45">Handles</div>
          <div className="flex flex-wrap gap-1">
            {([["bar", "Bar"], ["knob", "Knob"], ["cutout", "Cut-out"], ["none", "None"]] as const).map(([id, l]) => (
              <button key={id} onClick={() => set({ handleStyle: id })} className={chip(style.handleStyle === id)}>{l}</button>
            ))}
          </div>
        </div>
        <Swatches title="Handle finish" items={HARDWARE} value={style.hardware} onPick={id => set({ hardware: id as KitchenStyle["hardware"] })} />
      </div>

      <KitchenEstimate data={data} />
    </div>
  );
}

function Swatches({ title, items, value, onPick }: {
  title: string; items: { id: string; name: string; swatch: string }[]; value: string; onPick: (id: string) => void;
}) {
  const current = items.find(i => i.id === value);
  return (
    <div>
      <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wide text-white/45">
        <span>{title}</span><span className="normal-case tracking-normal text-white/60">{current?.name}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map(i => (
          <button key={i.id} onClick={() => onPick(i.id)} title={i.name}
            className={`h-6 w-6 rounded-full border ${value === i.id ? "ring-2 ring-[#c7de7d] border-white" : "border-white/30"}`}
            style={{ background: i.swatch }} />
        ))}
      </div>
    </div>
  );
}
