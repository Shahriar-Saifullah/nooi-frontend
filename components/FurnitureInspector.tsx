"use client";

/**
 * FurnitureInspector — customization panel for the selected placed item
 * ----------------------------------------------------------------------
 * Color swatches, material presets, uniform size slider, rotation, delete.
 * Renders above the library when something is selected.
 */

import React from "react";
import {
  catalogById, MATERIAL_PRESETS, COLOR_SWATCHES,
} from "@/lib/furniture/catalog";
import type { PlacedFurniture } from "@/components/ThreeSceneV2";
import { isLightFixture } from "@/components/LightingRig";

interface Props {
  item: PlacedFurniture;
  onChange: (patch: Partial<PlacedFurniture>) => void;
  onDelete: () => void;
}

export default function FurnitureInspector({ item, onChange, onDelete }: Props) {
  const cat = item.modelId ? catalogById(item.modelId) : undefined;
  const customizable = cat ? cat.customizable : true;
  const sizeScale = item.sizeScale ?? 1;
  const mountType = item.mountType ?? cat?.mountType ?? "floor";
  const isLight = isLightFixture(item);
  const level = Math.max(0, Math.min(1, item.lightLevel ?? 1));
  const on = level > 0;

  return (
    <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-sm font-semibold text-gray-800">{item.name}</div>
          {cat && (
            <div className="text-[10px] text-gray-400">
              {mountType === "wall"
                ? `${Math.round(cat.size.w * sizeScale)}×${Math.round(cat.size.h * sizeScale)} cm (Wall)`
                : <>{Math.round(cat.size.w * sizeScale)}×{Math.round(cat.size.d * sizeScale)}{mountType === "ceiling" ? `×${Math.round(cat.size.h * sizeScale)} cm (Ceiling)` : " cm"}</>}
            </div>
          )}
        </div>
        <button
          onClick={onDelete}
          className="text-[11px] px-2 py-1 rounded-md bg-red-50 text-red-600
                     border border-red-100 hover:bg-red-100"
        >
          Delete
        </button>
      </div>

      {isLight && (
        <div className="mb-3 rounded-lg bg-white border border-gray-200 p-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-gray-400 uppercase">Light</span>
            <button
              role="switch"
              aria-checked={on}
              onClick={() => onChange({ lightLevel: on ? 0 : 1 })}
              className={`relative h-5 w-9 rounded-full transition-colors ${on ? "bg-teal-700" : "bg-gray-300"}`}
              title={on ? "Switch off" : "Switch on"}
            >
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
            </button>
          </div>
          <input
            type="range" min={0.1} max={1} step={0.05}
            value={on ? level : 0.1}
            disabled={!on}
            onChange={e => onChange({ lightLevel: parseFloat(e.target.value) })}
            className="mt-2 w-full accent-teal-700 disabled:opacity-40"
            aria-label="Brightness"
          />
          <div className="flex justify-between text-[10px] text-gray-400">
            <span>Dim</span><span>{on ? `${Math.round(level * 100)}%` : "Off"}</span><span>Bright</span>
          </div>
        </div>
      )}

      {customizable && (
        <>
          <div className="text-[10px] font-semibold text-gray-400 uppercase mb-1">
            Color
          </div>
          <div className="flex gap-1.5 flex-wrap mb-3">
            <button
              onClick={() => onChange({ color: null })}
              className={`w-6 h-6 rounded-full border text-[9px] text-gray-500
                bg-white ${!item.color ? "ring-2 ring-teal-500" : "border-gray-200"}`}
              title="Original"
            >
              ⟲
            </button>
            {COLOR_SWATCHES.map(c => (
              <button
                key={c}
                onClick={() => onChange({ color: c })}
                className={`w-6 h-6 rounded-full border border-black/10
                  ${item.color === c ? "ring-2 ring-teal-500" : ""}`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>

          <div className="text-[10px] font-semibold text-gray-400 uppercase mb-1">
            Material
          </div>
          <div className="flex gap-1.5 flex-wrap mb-3">
            {MATERIAL_PRESETS.map(m => (
              <button
                key={m.id}
                onClick={() => onChange({
                  materialPreset: item.materialPreset === m.id ? null : m.id,
                })}
                className={`px-2 py-0.5 rounded-full text-[11px] border
                  ${item.materialPreset === m.id
                    ? "bg-teal-700 text-white border-teal-700"
                    : "bg-white text-gray-600 border-gray-200"}`}
              >
                {m.name}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="text-[10px] font-semibold text-gray-400 uppercase mb-1">
        Size — {Math.round(sizeScale * 100)}%
      </div>
      <input
        type="range" min={0.6} max={1.8} step={0.05}
        value={sizeScale}
        onChange={e => onChange({ sizeScale: parseFloat(e.target.value) })}
        className="w-full accent-teal-700 mb-3"
      />

      {mountType !== "wall" && <div className="flex gap-2">
        <button
          onClick={() => onChange({ rotation: (item.rotation ?? 0) - Math.PI / 4 })}
          className="flex-1 text-[11px] px-2 py-1.5 rounded-md bg-white border
                     border-gray-200 hover:border-gray-300"
        >
          ⟲ Rotate 45°
        </button>
        <button
          onClick={() => onChange({ rotation: (item.rotation ?? 0) + Math.PI / 4 })}
          className="flex-1 text-[11px] px-2 py-1.5 rounded-md bg-white border
                     border-gray-200 hover:border-gray-300"
        >
          Rotate 45° ⟳
        </button>
      </div>}
      <div className="mt-2 text-[10px] text-gray-400">
        {mountType === "wall"
          ? "Drag along a wall to move it, up or down to raise it · Delete removes"
          : <>{mountType === "ceiling" ? "Drag the item on the ceiling to move it" : "Drag the item on the floor to move it"} · R rotates · Delete removes</>}
        {isLight && " · Double-click switches it on or off"}
      </div>
    </div>
  );
}