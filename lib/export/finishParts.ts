/**
 * What a piece is made of — lib/export/finishParts.ts
 * ============================================================================
 * Pure helpers behind the furniture list's "Colour & material" column: name a
 * material from what the 3D model calls it (and how it looks), and boil a
 * model's many materials down to the few parts worth telling a builder about
 * ("Fabric - Beige", "Wood - Walnut brown"). modelFinish.ts reads the models.
 */

import { colourName, partColourName } from "./colourName";

export interface FinishPart {
  /** "Fabric", "Oak wood", "Metal (brass)"… */
  material: string;
  /** hex "" = not known (shown as "as in the picture", no swatch) */
  colour: { hex: string; name: string };
  /** share of the piece's visible surface, 0–1 */
  share: number;
}

// keyword → material; first match wins, so specific words come first
const KEYWORDS: [RegExp, string][] = [
  [/walnut/, "Walnut wood"], [/\boak/, "Oak wood"], [/teak/, "Teak wood"], [/pine/, "Pine wood"],
  [/beech/, "Beech wood"], [/birch/, "Birch wood"], [/mahogany/, "Mahogany wood"], [/ash\b|ashwood/, "Ash wood"],
  [/bamboo/, "Bamboo"], [/plywood|\bply\b/, "Plywood"], [/\bmdf\b/, "MDF"], [/veneer/, "Wood veneer"],
  [/wood|timber|lumber|\bplank|parquet/, "Wood"],
  [/velvet|velour/, "Velvet"], [/boucl/, "Boucle fabric"], [/linen/, "Linen"], [/wool|felt/, "Wool"],
  [/cotton/, "Cotton"], [/leather|suede/, "Leather"],
  [/mattress|sheet|blanket|duvet|bedding|bedspread|quilt|pillow|cushion|upholst|fabric|cloth|textile|sofa|seat|carpet|rug|curtain/, "Fabric"],
  [/rattan|wicker|cane\b/, "Rattan"], [/rope|jute/, "Rope / jute"],
  [/brass/, "Metal (brass)"], [/gold/, "Metal (gold finish)"], [/copper/, "Metal (copper)"], [/chrome/, "Metal (chrome)"],
  [/stainless|steel/, "Metal (steel)"], [/alumin/, "Metal (aluminium)"], [/iron/, "Metal (iron)"], [/metal|metallic/, "Metal"],
  [/mirror/, "Mirror"], [/glass|crystal/, "Glass"],
  [/marble/, "Marble"], [/granite/, "Granite"], [/terrazzo/, "Terrazzo"], [/concrete|cement/, "Concrete"], [/stone/, "Stone"],
  [/ceramic|porcelain|tile/, "Ceramic"], [/acrylic|plexi/, "Acrylic"], [/plastic|vinyl|pvc/, "Plastic"],
  [/rubber/, "Rubber"], [/paper/, "Paper"], [/canvas/, "Canvas"], [/lacquer|gloss/, "Lacquered finish"],
  [/paint/, "Painted finish"],
];

export interface MaterialLook {
  name: string;               // material + texture names from the model file
  metalness: number;
  roughness: number;
  opacity: number;            // 1 = solid
  transmission: number;
  textured: boolean;
  hex: string;                // its resulting colour
}

function hsl(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

/** Name a material: the model's own words first, then how it renders. */
export function materialKind(m: MaterialLook): string {
  const words = m.name.toLowerCase().replace(/[_\-.]+/g, " ");
  for (const [re, label] of KEYWORDS) if (re.test(words)) return label;
  if (m.transmission > 0.3 || m.opacity < 0.6) return "Glass";
  if (m.metalness > 0.6) return "Metal";
  const [h, s, l] = hsl(m.hex);
  // a textured brown / tan surface is almost always timber
  if (m.textured && h >= 15 && h <= 45 && s > 0.18 && l > 0.12 && l < 0.75) return "Wood";
  if (m.roughness >= 0.8) return m.textured ? "Fabric" : "Matte finish";
  if (m.roughness <= 0.3) return "Gloss finish";
  return "Satin finish";
}

/** Merge equal parts, drop slivers, keep the biggest few. */
export function summariseParts(parts: FinishPart[], max = 3): FinishPart[] {
  const total = parts.reduce((a, p) => a + p.share, 0) || 1;
  const merged = new Map<string, FinishPart>();
  for (const p of parts) {
    const key = `${p.material}|${p.colour.name}`;
    const cur = merged.get(key);
    if (cur) cur.share += p.share / total;
    else merged.set(key, { ...p, colour: { ...p.colour }, share: p.share / total });
  }
  const sorted = [...merged.values()].sort((a, b) => b.share - a.share);
  const kept = sorted.filter((p, i) => i === 0 || p.share >= 0.07).slice(0, max);
  const sum = kept.reduce((a, p) => a + p.share, 0) || 1;
  return kept.map(p => ({ ...p, share: p.share / sum }));
}

/** Pieces drawn in code (no model file): what they are really made of. */
export function proceduralParts(kind: string, hex: string): FinishPart[] {
  const c = (h: string) => ({ hex: h, name: colourName(h) });
  const wood = (h: string) => ({ hex: h, name: partColourName(h, "wood") });
  switch (kind) {
    case "tv": return [{ material: "Glass screen, plastic frame", colour: c(hex), share: 1 }];
    case "art-abstract":
    case "art-lines": return [
      { material: "Printed canvas", colour: c(hex), share: 0.85 },
      { material: "Wood frame", colour: wood("#2b2622"), share: 0.15 },
    ];
    case "mirror-round": return [
      { material: "Mirror", colour: c("#d9dee2"), share: 0.8 },
      { material: "Metal frame", colour: c(hex), share: 0.2 },
    ];
    case "curtains": return [{ material: "Fabric", colour: c(hex), share: 1 }];
    case "sconce": return [
      { material: "Metal", colour: c(hex), share: 0.6 },
      { material: "Glass shade", colour: c("#f3eee2"), share: 0.4 },
    ];
    case "split-ac":
    case "floor-ac":
    case "water-heater": return [{ material: "Powder-coated steel / ABS", colour: c(hex), share: 1 }];
    case "ceiling-fan": return [
      { material: "Metal", colour: c(hex), share: 0.45 },
      { material: "Wood blades", colour: wood("#8a6a4a"), share: 0.55 },
    ];
    case "socket":
    case "switch": return [{ material: "Plastic plate", colour: c(hex), share: 1 }];
    default: return [{ material: "Painted finish", colour: c(hex), share: 1 }];
  }
}

/**
 * The parts as the user styled them: a chosen colour recolours every part
 * (the 3D view tints them all), a chosen material replaces every part's.
 */
export function styledParts(
  parts: FinishPart[], colourHex: string | null | undefined, materialName: string | null | undefined,
): FinishPart[] {
  if (!colourHex && !materialName) return parts;
  return summariseParts(parts.map(p => {
    return {
      material: materialName ?? p.material,
      // a chosen colour is a paint / stain the user picked: name it plainly
      colour: colourHex ? { hex: colourHex, name: colourName(colourHex) } : p.colour,
      share: p.share,
    };
  }));
}
