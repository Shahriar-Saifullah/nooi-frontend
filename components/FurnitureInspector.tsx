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
import { formatMoney } from "@/lib/money";
import { toDeg } from "@/lib/placement/gizmo";
import SimilarProducts from "@/components/SimilarProducts";
import type { MarketplaceProduct } from "@/lib/api/marketplace";
import { pieceSizeCm, naturalSizeCm } from "@/lib/furniture/size";
import { stretchModeFor, getShares, subscribeShares, getSharesVersion, repeatsFor } from "@/lib/furniture/stretch";

interface Props {
  item: PlacedFurniture;
  onChange: (patch: Partial<PlacedFurniture>) => void;
  onDelete: () => void;
  /** swap a library piece for a real product with a 3D model */
  onUseProduct?: (product: MarketplaceProduct) => Promise<boolean> | boolean;
  /** open the Array tool for this piece */
  onArray?: () => void;
}

export default function FurnitureInspector({ item, onChange, onDelete, onUseProduct, onArray }: Props) {
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
              {(() => {
                const z = pieceSizeCm(item, cat);
                return mountType === "wall"
                  ? `${Math.round(z.w)}×${Math.round(z.h)} cm (Wall)`
                  : `${Math.round(z.w)}×${Math.round(z.d)}${mountType === "ceiling" ? `×${Math.round(z.h)} cm (Ceiling)` : " cm"}`;
              })()}
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

      {cat?.shop && (
        <div className="mb-3 rounded-lg bg-white border border-gray-200 p-2 text-[11.5px]">
          <div className="text-gray-500">{cat.shop.vendor ?? "Nooi vendor"}</div>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <span className="font-semibold text-teal-800">
              {cat.shop.onSale ? formatMoney(cat.shop.price) : "No longer for sale"}
            </span>
            <a
              href={`/marketplace/${cat.shop.productId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-700 underline hover:text-teal-900"
            >
              View product
            </a>
          </div>
          <div className="mt-1 text-[10px] text-gray-400">Shown at its real size, so it can&apos;t be resized.</div>
        </div>
      )}

      {/* library pieces: the real products closest to them */}
      {cat && !cat.shop && <SimilarProducts item={item} onUseInRoom={onUseProduct} />}

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

      {/* A real product comes in one size; resizing it would mislead the shopper. */}
      {!cat?.shop && <SizeFields item={item} onChange={onChange} />}

      {!cat?.shop && <>
        <div className="text-[10px] font-semibold text-gray-400 uppercase mb-1">
          Scale everything — {Math.round(sizeScale * 100)}%
        </div>
        <input
          type="range" min={0.6} max={1.8} step={0.05}
          value={sizeScale}
          onChange={e => onChange({ sizeScale: parseFloat(e.target.value) })}
          className="w-full accent-teal-700 mb-3"
        />
      </>}

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
      {onArray && mountType !== "wall" && (
        <button
          onClick={onArray}
          className="mt-2 w-full text-[11px] px-2 py-1.5 rounded-md bg-white border border-gray-200 hover:border-teal-400 text-gray-700"
          title="Repeat this piece in a row, a grid, or around a table"
        >
          ⧉ Array — repeat in a row, grid or around a table
        </button>
      )}
      {mountType !== "wall" && <AngleField key={`${item.id}-${toDeg(item.rotation ?? 0)}`}
        degrees={toDeg(item.rotation ?? 0)}
        onCommit={deg => onChange({ rotation: (deg * Math.PI) / 180 })} />}
      <div className="mt-2 text-[10px] text-gray-400">
        {mountType === "wall"
          ? "Drag along a wall to move it, up or down to raise it · Delete removes"
          : <>{mountType === "ceiling" ? "Drag the item on the ceiling to move it" : "Drag it to move · drag the blue ring to rotate (Shift: no snapping) · arrows slide it straight"} · R rotates · Delete removes</>}
        {isLight && " · Double-click switches it on or off"}
      </div>
    </div>
  );
}

/** Exact angle, 0–359°. Applied on Enter or when the field loses focus. */
function AngleField({ degrees, onCommit }: { degrees: number; onCommit: (deg: number) => void }) {
  const [text, setText] = React.useState(String(degrees));
  const commit = () => {
    const n = Number(text);
    if (!Number.isFinite(n)) { setText(String(degrees)); return; }
    const deg = ((Math.round(n) % 360) + 360) % 360;
    setText(String(deg));
    if (deg !== degrees) onCommit(deg);
  };
  return (
    <label className="mt-2 flex items-center justify-between gap-2 text-[11px] text-gray-500">
      Angle
      <span className="flex items-center gap-1">
        <input
          type="number" inputMode="numeric" min={0} max={359} step={1}
          value={text}
          onChange={e => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          className="w-16 rounded-md border border-gray-200 bg-white px-2 py-1 text-right text-[12px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
          aria-label="Angle in degrees"
        />
        <span>°</span>
      </span>
    </label>
  );
}

// ── Exact size ──────────────────────────────────────────────────────────────
// Width, depth and height in real cm. A typed size resets the "scale
// everything" slider to 100% and is kept on the piece (dims). Getting wider
// works the way the piece would really be made wider: sofas gain seats,
// shelves gain bays, tables get a longer top (lib/furniture/stretch).

const LIMITS = { w: [20, 800], d: [10, 300], h: [10, 300] } as const;

function SizeFields({ item, onChange }: { item: PlacedFurniture; onChange: (patch: Partial<PlacedFurniture>) => void }) {
  const cat = item.modelId ? catalogById(item.modelId) : undefined;
  const now = pieceSizeCm(item, cat);
  const natural = naturalSizeCm({ ...item, sizeScale: 1 }, cat);
  const [lock, setLock] = React.useState(false);
  const { mode, unit } = stretchModeFor(cat);
  React.useSyncExternalStore(subscribeShares, getSharesVersion, getSharesVersion);
  const share = cat ? getShares(cat.id) : undefined;

  const commit = (axis: "w" | "d" | "h", value: number) => {
    if (!Number.isFinite(value) || value <= 0) return;
    const [lo, hi] = LIMITS[axis];
    const v = Math.max(lo, Math.min(hi, Math.round(value)));
    if (Math.round(now[axis]) === v) return;
    const next = { ...now };
    if (lock) {
      const k = v / now[axis];
      next.w = now.w * k; next.d = now.d * k; next.h = now.h * k;
    } else next[axis] = v;
    onChange({ dims: { w: Math.round(next.w), d: Math.round(next.d), h: Math.round(next.h) }, sizeScale: 1 });
  };

  const field = (axis: "w" | "d" | "h", label: string) => (
    <label className="flex flex-col gap-0.5 text-[10px] text-gray-500">
      {label}
      <input
        key={`${item.id}-${axis}-${Math.round(now[axis])}`}
        type="number" inputMode="numeric" min={LIMITS[axis][0]} max={LIMITS[axis][1]} step={1}
        defaultValue={Math.round(now[axis])}
        onBlur={e => commit(axis, Number(e.currentTarget.value))}
        onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }}
        className="w-full rounded-md border border-gray-200 bg-white px-1.5 py-1 text-right text-[12px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
        aria-label={`${label} in cm`}
      />
    </label>
  );

  // what the width does to this kind of piece
  let note: string | null = null;
  if (item.dims && mode === "repeat" && share?.how === "stretch" && Math.abs(now.w / natural.w - 1) > 0.02) {
    note = `Longer ${unit} — the ends keep their size`;
  } else if (item.dims && mode === "repeat" && share) {
    const n = repeatsFor(share, natural.w, now.w);
    const extra = n - 1;
    if (extra > 0) note = `${extra} extra ${unit}${extra === 1 ? "" : "s"} added — the ends keep their size`;
    else if (now.w > natural.w * 1.02) note = `Wider ${unit} — keep widening for another ${unit}`;
    else if (now.w < natural.w * 0.98) note = `Narrower ${unit}s — the ends keep their size`;
  } else if (item.dims && mode === "stretch" && Math.abs(now.w / natural.w - 1) > 0.02) {
    note = "Longer top — the legs keep their size";
  } else if (mode === "repeat" && !item.dims && share?.how !== "stretch") {
    note = `Make it wider to add ${unit}s`;
  }

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold text-gray-400 uppercase">Size (cm)</span>
        <span className="flex items-center gap-2">
          <button
            onClick={() => setLock(l => !l)}
            className={`text-[10.5px] rounded px-1.5 py-0.5 border ${lock ? "bg-teal-700 text-white border-teal-700" : "bg-white text-gray-500 border-gray-200"}`}
            title={lock ? "Proportions locked: changing one size changes all three" : "Lock proportions"}
            aria-pressed={lock}
          >
            {lock ? "🔒 Locked" : "🔓 Free"}
          </button>
          {item.dims && (
            <button onClick={() => onChange({ dims: undefined })} className="text-[10.5px] text-teal-700 hover:underline" title="Back to the model's own size">
              Reset
            </button>
          )}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {field("w", "Width")}
        {field("d", "Depth")}
        {field("h", "Height")}
      </div>
      {note && <div className="mt-1 text-[10.5px] text-teal-800">{note}</div>}
    </div>
  );
}
