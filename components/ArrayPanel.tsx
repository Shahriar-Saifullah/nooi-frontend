"use client";

/**
 * Array panel — repeat the selected piece in a row, a grid, or round a table.
 * The page works out the spots (lib/placement/array) and shows them as a
 * preview in 3D; this is just the controls.
 */

import React from "react";
import { X } from "lucide-react";
import type { RowDirection } from "@/lib/placement/array";

export type ArrayMode = "row" | "grid" | "around";

export interface ArrayConfig {
  mode: ArrayMode;
  // row
  count: number; gapCm: number; dir: RowDirection;
  // grid
  rows: number; cols: number; gapXCm: number; gapZCm: number;
  // around a table
  tableId: string | null; seats: number;
}

export const DEFAULT_ARRAY: ArrayConfig = {
  mode: "row", count: 4, gapCm: 10, dir: "right",
  rows: 2, cols: 3, gapXCm: 60, gapZCm: 80,
  tableId: null, seats: 6,
};

interface Props {
  name: string;
  config: ArrayConfig;
  onChange: (c: ArrayConfig) => void;
  tables: { id: string; name: string }[];
  /** how the preview turned out */
  summary: { total: number; blocked: number };
  onApply: () => void;
  onClose: () => void;
}

function Num({ label, value, min, max, onChange, suffix }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void; suffix?: string;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-[11px] text-gray-600">
      {label}
      <span className="flex items-center gap-1">
        <input
          type="number" min={min} max={max} step={1} value={value}
          onChange={e => {
            const v = Number(e.target.value);
            if (Number.isFinite(v)) onChange(Math.max(min, Math.min(max, Math.round(v))));
          }}
          className="w-16 rounded-md border border-gray-200 bg-white px-2 py-1 text-right text-[12px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
        />
        {suffix && <span className="w-5 text-gray-400">{suffix}</span>}
      </span>
    </label>
  );
}

export default function ArrayPanel({ name, config, onChange, tables, summary, onApply, onClose }: Props) {
  const set = (patch: Partial<ArrayConfig>) => onChange({ ...config, ...patch });
  const ok = summary.total - summary.blocked;
  return (
    <div className="rounded-xl border border-teal-200 bg-white p-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold text-gray-800">Array · {name}</div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700" title="Close"><X size={14} /></button>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-0.5 rounded-lg bg-gray-100 p-0.5">
        {(["row", "grid", "around"] as const).map(m => (
          <button
            key={m}
            onClick={() => set({ mode: m })}
            className={`rounded-md py-1 text-[11px] font-medium ${config.mode === m ? "bg-white text-teal-800 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
          >
            {m === "row" ? "Row" : m === "grid" ? "Grid" : "Around table"}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {config.mode === "row" && <>
          <Num label="How many (in total)" value={config.count} min={2} max={20} onChange={v => set({ count: v })} />
          <Num label="Gap between" value={config.gapCm} min={0} max={300} onChange={v => set({ gapCm: v })} suffix="cm" />
          <div className="flex items-center justify-between text-[11px] text-gray-600">
            Direction
            <div className="flex gap-0.5">
              {(["left", "right", "front", "back"] as const).map(d => (
                <button key={d} onClick={() => set({ dir: d })}
                  className={`rounded px-1.5 py-0.5 text-[10.5px] border ${config.dir === d ? "bg-teal-700 text-white border-teal-700" : "bg-white text-gray-600 border-gray-200"}`}>
                  {d === "left" ? "← Left" : d === "right" ? "Right →" : d === "front" ? "Front" : "Back"}
                </button>
              ))}
            </div>
          </div>
        </>}

        {config.mode === "grid" && <>
          <Num label="Columns" value={config.cols} min={1} max={10} onChange={v => set({ cols: v })} />
          <Num label="Rows" value={config.rows} min={1} max={10} onChange={v => set({ rows: v })} />
          <Num label="Gap side to side" value={config.gapXCm} min={0} max={300} onChange={v => set({ gapXCm: v })} suffix="cm" />
          <Num label="Gap between rows" value={config.gapZCm} min={0} max={300} onChange={v => set({ gapZCm: v })} suffix="cm" />
          <p className="text-[10.5px] text-gray-400">Columns run to its right, rows go behind it.</p>
        </>}

        {config.mode === "around" && (tables.length === 0 ? (
          <p className="text-[11px] text-gray-500">Place a table in the room first, then come back to seat chairs round it.</p>
        ) : <>
          <label className="flex items-center justify-between gap-2 text-[11px] text-gray-600">
            Table
            <select
              value={config.tableId ?? tables[0].id}
              onChange={e => set({ tableId: e.target.value })}
              className="max-w-[150px] rounded-md border border-gray-200 bg-white px-1.5 py-1 text-[11.5px]"
            >
              {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <Num label="Seats (in total)" value={config.seats} min={1} max={16} onChange={v => set({ seats: v })} />
          <p className="text-[10.5px] text-gray-400">This piece becomes one of them; all face the table.</p>
        </>)}
      </div>

      <div className="mt-3 text-[11px] text-gray-500">
        {summary.total === 0 ? "Nothing to add." :
          summary.blocked === 0 ? `${summary.total} ${config.mode === "around" ? "seat" : "new piece"}${summary.total === 1 ? "" : "s"} — shown in green in 3D.` :
          `${ok} of ${summary.total} fit; ${summary.blocked} in red hit a wall, other furniture, or fall outside the rooms and will be skipped.`}
      </div>
      <div className="mt-2 flex gap-2">
        <button onClick={onClose} className="flex-1 rounded-md border border-gray-200 py-1.5 text-[11.5px] text-gray-600 hover:bg-gray-50">Cancel</button>
        <button onClick={onApply} disabled={ok === 0}
          className="flex-1 rounded-md bg-teal-700 py-1.5 text-[11.5px] font-medium text-white hover:bg-teal-800 disabled:opacity-40">
          Apply
        </button>
      </div>
    </div>
  );
}
