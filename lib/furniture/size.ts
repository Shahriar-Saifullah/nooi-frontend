/**
 * A placed piece's real size — lib/furniture/size.ts
 * ============================================================================
 * One rule for every consumer (3D model fit, footprints and collisions,
 * measurements, the furniture list, product matching):
 *
 *   base   the size the user typed (dims), else the catalogue size, else the
 *          size stored on the piece when it was placed (a shop item whose
 *          details haven't loaded yet)
 *   × the size slider (sizeScale)
 *
 * Centimetres in, centimetres out.
 */

import { catalogById, type CatalogItem } from "./catalog";

export interface SizedPiece {
  modelId?: string;
  sizeScale?: number;
  dims?: { w: number; d: number; h: number };
  width?: number; depth?: number; height?: number;
}

export function pieceSizeCm(
  f: SizedPiece,
  cat: CatalogItem | undefined = f.modelId ? catalogById(f.modelId) : undefined,
  fallback = { w: 60, d: 60, h: 60 },
): { w: number; d: number; h: number } {
  const s = f.sizeScale ?? 1;
  const base = f.dims ?? {
    w: f.width ?? cat?.size.w ?? fallback.w,
    d: f.depth ?? cat?.size.d ?? fallback.d,
    h: f.height ?? cat?.size.h ?? fallback.h,
  };
  return { w: base.w * s, d: base.d * s, h: base.h * s };
}

/** The size the 3D model comes at (catalogue size × slider), before any
 *  typed size. Smart stretch compares the typed width with this. */
export function naturalSizeCm(f: SizedPiece, cat: CatalogItem | undefined) {
  const s = f.sizeScale ?? 1;
  return cat ? { w: cat.size.w * s, d: cat.size.d * s, h: cat.size.h * s } : pieceSizeCm({ ...f, dims: undefined }, cat);
}

/** The size the 3D model is drawn at: the typed size, else the model's own. */
export function drawnSizeCm(f: SizedPiece, cat: CatalogItem | undefined) {
  if (!f.dims) return naturalSizeCm(f, cat);
  const s = f.sizeScale ?? 1;
  return { w: f.dims.w * s, d: f.dims.d * s, h: f.dims.h * s };
}
