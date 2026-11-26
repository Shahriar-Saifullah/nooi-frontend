/**
 * Factory details for a kitchen — lib/production/spec.ts
 * ============================================================================
 * The options form from the factories' own drawing sheets (materials, doors,
 * hinges, handles, runners, fillers, kick board, how it's installed), filled
 * in from the kitchen as designed. Same fields and keys as the order-line
 * spec on the backend (services/factory.service.ts SPEC_FIELDS), so a kitchen
 * order and a marketplace order give a factory the same form.
 *
 * Everything is guidance for the factory to confirm; blanks are left for the
 * client or the factory to fill in.
 */

import { PLINTH, CARCASS, TALL_TOP, UPPER_BOTTOM } from "@/lib/kitchen/model";
import { countertopName, frontFinishName, hardwareName, type KitchenParts } from "./parts";
import type { KitchenOrderInput } from "./placement";
import type { ProductionRules } from "./rules";

export const SPEC_FIELDS = [
  { key: "dimensions", label: "Overall size", zh: "尺寸" },
  { key: "carcass", label: "Carcass material and colour", zh: "柜体材质/颜色" },
  { key: "back", label: "Back panel material and colour", zh: "背板材质/颜色" },
  { key: "doors", label: "Hinged doors: model and colour", zh: "开门型号/颜色" },
  { key: "sliding_doors", label: "Sliding doors: model and colour", zh: "移门型号/颜色" },
  { key: "hinges", label: "Hinges", zh: "门铰 全盖/半盖/内掩" },
  { key: "handles", label: "Handles", zh: "拉手" },
  { key: "runners", label: "Drawer runners", zh: "抽屉滑轨" },
  { key: "rails", label: "Hanging rails", zh: "衣通" },
  { key: "special_hardware", label: "Special hardware", zh: "特殊五金" },
  { key: "fillers", label: "Fillers / scribes", zh: "收口条" },
  { key: "top_panel", label: "Top filler panel", zh: "顶封板" },
  { key: "kick", label: "Kick board", zh: "踢脚板" },
  { key: "end_panels", label: "Finished end panels", zh: "看面板" },
  { key: "install_on", label: "Stands on (finished floor / bare screed)", zh: "安装方式 地板/水泥地上" },
  { key: "cornice", label: "Ceiling cornice (yes / no)", zh: "石膏线 有/无" },
  { key: "notes", label: "Notes for the factory", zh: "备注" },
] as const;
export type SpecKey = (typeof SPEC_FIELDS)[number]["key"];

const TO_CONFIRM = "To confirm";

/** The form filled from the design; anything the design doesn't decide says "To confirm". */
export function kitchenSpec(input: KitchenOrderInput, k: KitchenParts, rules: ProductionRules): Record<SpecKey, string> {
  const s = input.style;
  const qty = (match: (item: string) => boolean) => k.hardware.filter(h => match(h.item)).reduce((a, h) => a + h.qty, 0);
  const hinges = qty(i => i === rules.hingeName);
  const drawers = qty(i => i.startsWith(rules.runnerName));
  const handles = qty(i => i.startsWith("Handle"));
  const fillers = k.cabinets.filter(c => c.type === "filler");
  const hasTall = k.cabinets.some(c => c.type === "tall");
  const hasWall = k.cabinets.some(c => c.type === "wall");
  const counter = Math.round((PLINTH + CARCASS) * 1000) + (k.worktops[0]?.thickness ?? 20);
  return {
    dimensions: [
      k.runs.map(r => `${r.code} ${r.length} mm long`).join("; "),
      `worktop at ${counter} mm`,
      hasWall ? `wall cabinets ${Math.round(UPPER_BOTTOM * 1000)}–${Math.round(TALL_TOP * 1000)} mm` : "",
      hasTall ? `tall units to ${Math.round(TALL_TOP * 1000)} mm` : "",
      "base depth 600 mm, wall cabinets 350 mm",
    ].filter(Boolean).join("; "),
    carcass: `${rules.carcassBoard.material}, ${rules.carcassBoard.thickness} mm (Nooi default)`,
    back: `${rules.backBoard.material}, ${rules.backBoard.thickness} mm (Nooi default)`,
    doors: `${frontFinishName(s)}; full overlay, ${rules.frontGap} mm gaps`,
    sliding_doors: "None",
    hinges: hinges ? `${hinges} × ${rules.hingeName.toLowerCase()}` : "None",
    handles: s.handleStyle === "bar" || s.handleStyle === "knob" ? `${handles} × ${s.handleStyle} handle, ${hardwareName(s)}` : s.handleStyle === "cutout" ? "Handle-free (cut-out)" : "Handle-free",
    runners: drawers ? `${drawers} drawers, ${rules.runnerName.toLowerCase()}` : "None",
    rails: "None",
    special_hardware: TO_CONFIRM,
    fillers: fillers.length ? `${fillers.length} corner filler${fillers.length === 1 ? "" : "s"} (${fillers.map(f => `${f.code} ${f.width} mm`).join(", ")}); others to scribe on site` : "Scribe on site where needed",
    top_panel: hasTall || hasWall ? TO_CONFIRM : "None",
    kick: `${Math.round(PLINTH * 1000)} mm plinth, set back ${rules.plinthSetback} mm, to match fronts`,
    end_panels: TO_CONFIRM,
    install_on: TO_CONFIRM,
    cornice: TO_CONFIRM,
    notes: [
      `Worktop: ${countertopName(s.countertop)}`,
      k.appliances.length ? `appliances: ${k.appliances.map(a => a.item).join(", ")}` : "",
      "sizes are from the design; please confirm on site",
    ].filter(Boolean).join("; "),
  };
}

export function specRows(spec: Record<SpecKey, string>): [string, string, string][] {
  return SPEC_FIELDS.map(f => [f.label, f.zh, spec[f.key] ?? ""]);
}
