/**
 * Show / hide in the 3D view — lib/scene/visibility.ts
 * ============================================================================
 * What the client wanted: hide all lighting, all sofas, one armchair, the
 * kitchen … to see a room without them, and show them again. Hidden pieces
 * stay in the project (and the shopping list); they're just not drawn, and a
 * hidden lamp doesn't light the room.
 *
 *   groups   a catalogue category ("living", "decor" …) or "lighting"
 *   types    a furniture type ("sofa", "armchair" …)
 *   items    single placed pieces, by id
 *   kitchen  the kitchen builder's cabinets
 *
 * Saved with the project (room_data.hidden). Pure.
 */

export interface HiddenSet {
  groups: string[];
  types: string[];
  items: string[];
  kitchen?: boolean;
}

export const EMPTY_HIDDEN: HiddenSet = { groups: [], types: [], items: [], kitchen: false };
export const LIGHTING = "lighting";

export interface PieceLike { id: string; modelId?: string }
export interface CatLike { category: string; typeId: string }

const strings = (v: unknown, max: number, len: number) =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string" && x.length > 0 && x.length <= len))].slice(0, max) : [];

export function cleanHidden(raw: unknown): HiddenSet {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    groups: strings(r.groups, 30, 40),
    types: strings(r.types, 300, 80),
    items: strings(r.items, 500, 80),
    kitchen: r.kitchen === true,
  };
}

export const nothingHidden = (h: HiddenSet) =>
  !h.groups.length && !h.types.length && !h.items.length && !h.kitchen;

/** Is this piece hidden? `isLight` says whether it's a light fitting. */
export function isHidden(p: PieceLike, cat: CatLike | undefined, isLight: boolean, h: HiddenSet): boolean {
  if (h.items.includes(p.id)) return true;
  if (isLight && h.groups.includes(LIGHTING)) return true;
  if (!cat) return false;
  return h.groups.includes(cat.category) || h.types.includes(cat.typeId);
}

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter(x => x !== v) : [...list, v]);

export const toggleGroup = (h: HiddenSet, g: string): HiddenSet => ({ ...h, groups: toggle(h.groups, g) });
export const toggleType = (h: HiddenSet, t: string): HiddenSet => ({ ...h, types: toggle(h.types, t) });
export const toggleItem = (h: HiddenSet, id: string): HiddenSet => ({ ...h, items: toggle(h.items, id) });
export const toggleKitchen = (h: HiddenSet): HiddenSet => ({ ...h, kitchen: !h.kitchen });

/** Drop single-piece entries for pieces that no longer exist. */
export function pruneHidden(h: HiddenSet, ids: Set<string>): HiddenSet {
  const items = h.items.filter(id => ids.has(id));
  return items.length === h.items.length ? h : { ...h, items };
}

export interface VisibilityRow { key: string; label: string; count: number; hidden: number }

/**
 * What's in the room, for the panel: a row per group (lighting first) and per
 * type, with how many pieces each has and how many of them are hidden.
 */
export function visibilityRows<T extends PieceLike>(
  pieces: T[],
  catOf: (p: T) => (CatLike & { typeName?: string }) | undefined,
  isLight: (p: T) => boolean,
  h: HiddenSet,
  groupLabel: (g: string) => string,
): { groups: VisibilityRow[]; types: VisibilityRow[] } {
  const groups = new Map<string, VisibilityRow>();
  const types = new Map<string, VisibilityRow>();
  for (const p of pieces) {
    const cat = catOf(p);
    const hid = isHidden(p, cat, isLight(p), h) ? 1 : 0;
    const bump = (m: Map<string, VisibilityRow>, key: string, label: string) => {
      const row = m.get(key) ?? { key, label, count: 0, hidden: 0 };
      row.count += 1;
      row.hidden += hid;
      m.set(key, row);
    };
    if (isLight(p)) bump(groups, LIGHTING, groupLabel(LIGHTING));
    if (cat) {
      if (cat.category !== LIGHTING) bump(groups, cat.category, groupLabel(cat.category));
      bump(types, cat.typeId, cat.typeName ?? cat.typeId);
    }
  }
  const byLabel = (a: VisibilityRow, b: VisibilityRow) => a.label.localeCompare(b.label);
  const g = [...groups.values()].sort((a, b) => (a.key === LIGHTING ? -1 : b.key === LIGHTING ? 1 : byLabel(a, b)));
  return { groups: g, types: [...types.values()].sort(byLabel) };
}
