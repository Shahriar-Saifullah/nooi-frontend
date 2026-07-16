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

interface Props {
  item: PlacedFurniture;
  onChange: (patch: Partial<PlacedFurniture>) => void;
  onDelete: () => void;
}

export default function FurnitureInspector({ item, onChange, onDelete }: Props) {
  const cat = item.modelId ? catalogById(item.modelId) : undefined;
  const customizable = cat ? cat.customizable : true;
  const sizeScale = item.sizeScale ?? 1;

  return (
    <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-sm font-semibold text-gray-800">{item.name}</div>
          {cat && (
            <div className="text-[10px] text-gray-400">
              {Math.round(cat.size.w * sizeScale)}×{Math.round(cat.size.d * sizeScale)} cm
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

      <div className="flex gap-2">
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
      </div>
      <div className="mt-2 text-[10px] text-gray-400">
        Drag the item on the floor to move it · R rotates · Delete removes
      </div>
    </div>
  );
}