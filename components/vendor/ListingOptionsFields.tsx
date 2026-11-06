"use client";

/**
 * Vendor listing form: how it's priced (per piece, or per metre of width for
 * made-to-measure pieces) and the options shoppers choose from — fabrics,
 * legs, handles, colour codes, textures — each with a swatch and an extra
 * price. Controlled; rules in lib/listings/configure.ts.
 */

import React, { useEffect, useRef } from "react";
import { OPTION_KINDS, MAX_CHOICES, MAX_GROUPS, type OptionKind } from "@/lib/listings/configure";
import type { EditableChoice, EditableGroup, ListingPricingValue } from "@/lib/listings/pricingForm";
export { EMPTY_PRICING, pricingPayload, pricingProblem, type ListingPricingValue } from "@/lib/listings/pricingForm";

const label: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontSize: 13, fontWeight: 500, color: "#343837" };
const input: React.CSSProperties = { padding: "8px 10px", border: "1px solid #D5DBDA", borderRadius: 8, fontSize: 13, background: "#FFFFFF", color: "#101212", outline: "none", minWidth: 0 };
const hint: React.CSSProperties = { fontSize: 12, color: "#8E9493", fontWeight: 400 };
const linkBtn: React.CSSProperties = { background: "none", border: "none", color: "#004643", fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: 0, justifySelf: "start", alignSelf: "flex-start" };
const removeBtn: React.CSSProperties = { background: "none", border: "none", color: "#B42318", fontSize: 12, cursor: "pointer", padding: "0 4px" };
const seg = (on: boolean): React.CSSProperties => ({
  flex: 1, padding: "8px 10px", fontSize: 13, borderRadius: 7, border: "none", cursor: "pointer",
  background: on ? "#FFFFFF" : "transparent", color: on ? "#004643" : "#646968", fontWeight: on ? 600 : 500,
  boxShadow: on ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
});

export default function ListingOptionsFields({
  value, onChange, priceLabel, uploadSwatch,
}: {
  value: ListingPricingValue;
  onChange: (v: ListingPricingValue) => void;
  /** the price field's current text, for the hint */
  priceLabel: string;
  uploadSwatch: (file: File) => Promise<string>;
}) {
  const latest = useRef(value);
  useEffect(() => { latest.current = value; }, [value]);
  const set = (patch: Partial<ListingPricingValue>) => onChange({ ...value, ...patch });
  const setGroup = (gi: number, patch: Partial<EditableGroup>) =>
    set({ options: value.options.map((g, i) => (i === gi ? { ...g, ...patch } : g)) });
  const setChoice = (gi: number, ci: number, patch: Partial<EditableChoice>) =>
    setGroup(gi, { choices: value.options[gi].choices.map((c, j) => (j === ci ? { ...c, ...patch } : c)) });
  const perMetre = value.price_unit === "metre";

  const attach = async (gi: number, ci: number, file: File | undefined) => {
    if (!file) return;
    const patchLatest = (patch: Partial<EditableChoice>) => {
      const cur = latest.current;
      onChange({ ...cur, options: cur.options.map((g, i) => i !== gi ? g : { ...g, choices: g.choices.map((c, j) => (j === ci ? { ...c, ...patch } : c)) }) });
    };
    setChoice(gi, ci, { uploading: true });
    try {
      const url = await uploadSwatch(file);
      patchLatest({ image: url, uploading: false });
    } catch (e) {
      patchLatest({ uploading: false });
      alert(e instanceof Error ? e.message : "Upload failed");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={label}>
        Priced
        <div style={{ display: "flex", gap: 4, background: "#F1F4F4", borderRadius: 9, padding: 3 }}>
          <button type="button" style={seg(!perMetre)} onClick={() => set({ price_unit: "unit" })}>Per piece</button>
          <button type="button" style={seg(perMetre)} onClick={() => set({ price_unit: "metre" })}>Per metre of width</button>
        </div>
        <span style={hint}>
          {perMetre
            ? `Made to measure: the price above${priceLabel ? ` (SAR ${priceLabel})` : ""} is per metre of width. Shoppers choose a width, or stretch it in their room.`
            : "One price for the piece as listed."}
        </span>
      </div>

      {perMetre && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
          <label style={label}>
            Smallest width you make (cm)
            <input style={input} inputMode="numeric" placeholder="e.g. 160" value={value.min_width_cm} onChange={e => set({ min_width_cm: e.target.value.replace(/[^0-9]/g, "") })} />
          </label>
          <label style={label}>
            Largest width (cm)
            <input style={input} inputMode="numeric" placeholder="e.g. 400" value={value.max_width_cm} onChange={e => set({ max_width_cm: e.target.value.replace(/[^0-9]/g, "") })} />
          </label>
        </div>
      )}

      <div style={label}>
        Options shoppers choose
        <span style={hint}>Fabrics, legs, handles, colour codes, textures… The first choice in each group is the default.</span>
        <div style={{ display: "grid", gap: 10, marginTop: 4 }}>
          {value.options.map((g, gi) => (
            <div key={gi} style={{ border: "1px solid #EAEDEC", borderRadius: 10, padding: 10, background: "#FBFCFC", display: "grid", gap: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.3fr) minmax(0,1fr) auto", gap: 8, alignItems: "center" }}>
                <input style={input} placeholder="Group name, e.g. Fabric" value={g.name} onChange={e => setGroup(gi, { name: e.target.value })} />
                <select style={{ ...input, cursor: "pointer" }} value={g.kind} onChange={e => setGroup(gi, { kind: e.target.value as OptionKind })}>
                  {OPTION_KINDS.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                </select>
                <button type="button" style={removeBtn} onClick={() => set({ options: value.options.filter((_, i) => i !== gi) })}>Remove group</button>
              </div>
              {g.choices.map((c, ci) => (
                <div key={ci} style={{ display: "grid", gridTemplateColumns: "34px minmax(0,1.4fr) minmax(0,1fr) 40px minmax(0,0.9fr) auto", gap: 6, alignItems: "center" }}>
                  <label title="Swatch photo" style={{
                    width: 30, height: 30, borderRadius: 999, border: "1px solid #D5DBDA", cursor: "pointer",
                    background: c.image ? `center / cover url("${c.image}")` : c.hex || "#F1F4F4",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#8E9493",
                  }}>
                    {c.uploading ? "…" : !c.image && !c.hex ? "+" : ""}
                    <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => { attach(gi, ci, e.target.files?.[0]); e.target.value = ""; }} />
                  </label>
                  <input style={input} placeholder="Choice, e.g. Velvet green" value={c.name} onChange={e => setChoice(gi, ci, { name: e.target.value })} />
                  <input style={input} placeholder="Code (optional)" value={c.code ?? ""} onChange={e => setChoice(gi, ci, { code: e.target.value })} />
                  <input type="color" title="Swatch colour" value={c.hex || "#cccccc"} onChange={e => setChoice(gi, ci, { hex: e.target.value })}
                    style={{ width: 36, height: 30, padding: 0, border: "1px solid #D5DBDA", borderRadius: 6, background: "#fff", cursor: "pointer" }} />
                  <input style={input} inputMode="decimal" placeholder={perMetre ? "+SAR / m" : "+SAR"} value={String(c.price_delta ?? "")}
                    onChange={e => setChoice(gi, ci, { price_delta: e.target.value.replace(/[^0-9.\-]/g, "") })} />
                  <button type="button" style={removeBtn} onClick={() => setGroup(gi, { choices: g.choices.filter((_, j) => j !== ci) })}>✕</button>
                </div>
              ))}
              {g.choices.length < MAX_CHOICES && (
                <button type="button" style={linkBtn} onClick={() => setGroup(gi, { choices: [...g.choices, { name: "", price_delta: "" }] })}>+ Add choice</button>
              )}
            </div>
          ))}
          {value.options.length < MAX_GROUPS && (
            <button type="button" style={linkBtn}
              onClick={() => set({ options: [...value.options, { name: "", kind: "fabric", choices: [{ name: "", price_delta: "" }] }] })}>
              + Add option group
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
