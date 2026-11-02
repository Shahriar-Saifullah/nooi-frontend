/** A plain colour name for a swatch ("Navy", "Walnut brown") — lib/export/colourName.ts */

const COLOUR_NAMES: [string, [number, number, number]][] = [
  ["White", [245, 245, 242]], ["Off-white", [236, 230, 218]], ["Cream", [240, 228, 196]],
  ["Beige", [214, 196, 165]], ["Sand", [196, 176, 140]], ["Light grey", [200, 200, 200]],
  ["Grey", [140, 140, 140]], ["Charcoal", [64, 64, 66]], ["Black", [22, 22, 22]],
  ["Light wood", [196, 160, 112]], ["Oak brown", [160, 120, 78]], ["Walnut brown", [110, 76, 50]],
  ["Dark brown", [70, 46, 32]], ["Terracotta", [190, 100, 70]], ["Red", [180, 40, 40]],
  ["Burgundy", [110, 28, 40]], ["Pink", [226, 160, 170]], ["Orange", [222, 130, 50]],
  ["Mustard", [206, 160, 50]], ["Yellow", [236, 210, 80]], ["Olive", [120, 120, 60]],
  ["Sage green", [150, 170, 140]], ["Green", [60, 130, 80]], ["Forest green", [34, 80, 52]],
  ["Teal", [30, 110, 110]], ["Light blue", [160, 196, 222]], ["Blue", [50, 100, 170]],
  ["Navy", [30, 42, 80]], ["Lavender", [180, 160, 210]], ["Purple", [100, 60, 130]],
];

export function colourName(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  let best = COLOUR_NAMES[0][0], bd = Infinity;
  for (const [name, c] of COLOUR_NAMES) {
    // weighted RGB distance — close enough for naming a swatch
    const d = 2 * (rgb[0] - c[0]) ** 2 + 4 * (rgb[1] - c[1]) ** 2 + 3 * (rgb[2] - c[2]) ** 2;
    if (d < bd) { bd = d; best = name; }
  }
  return best;
}


// timber is described by its tone, not as "Beige" or "Pink"
const WOOD_TONES: [string, [number, number, number]][] = [
  ["White-washed wood", [232, 222, 205]], ["Light oak", [222, 186, 140]], ["Natural oak", [190, 145, 95]],
  ["Teak", [160, 105, 60]], ["Walnut", [110, 76, 50]], ["Dark walnut", [72, 50, 34]],
  ["Espresso", [45, 32, 26]], ["Black-stained wood", [20, 18, 17]], ["Grey-washed wood", [150, 145, 138]],
];

export function woodToneName(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  let best = WOOD_TONES[0][0], bd = Infinity;
  for (const [name, c] of WOOD_TONES) {
    const d = 2 * (rgb[0] - c[0]) ** 2 + 4 * (rgb[1] - c[1]) ** 2 + 3 * (rgb[2] - c[2]) ** 2;
    if (d < bd) { bd = d; best = name; }
  }
  return best;
}

/** The right name for a part's colour: wood tones for timber. */
export function partColourName(hex: string, material: string): string {
  return /wood|veneer|bamboo|plywood|\bmdf\b|timber/i.test(material) ? woodToneName(hex) : colourName(hex);
}
