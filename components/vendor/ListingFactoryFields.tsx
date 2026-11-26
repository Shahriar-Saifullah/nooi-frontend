"use client";

/**
 * "For factories" on the new-listing form: usual size ranges with a note
 * (guidance, never enforced), and the product's own drawings (DWG / DXF /
 * PDF). Drawings upload to the vendor's draft folder and are saved with the
 * listing (lib/listings/factory.ts).
 */

import React from "react";
import DrawingsList from "@/components/factory/DrawingsList";
import { uploadDrawingFile, drawingKind, type Drawing } from "@/lib/api/factory";
import { SIZE_AXES, type ListingFactoryValue } from "@/lib/listings/factory";

const inputStyle: React.CSSProperties = { padding: "9px 10px", border: "1px solid #D5DBDA", borderRadius: "8px", fontSize: "13px", background: "#FFFFFF", color: "#101212", outline: "none", width: "100%" };

export default function ListingFactoryFields({ value, onChange }: { value: ListingFactoryValue; onChange: (v: ListingFactoryValue) => void }) {
  // uploads finish one after another; always add to the latest value
  const latest = React.useRef(value);
  React.useEffect(() => { latest.current = value; }, [value]);
  const setRange = (axis: (typeof SIZE_AXES)[number]["key"], end: "min" | "max", s: string) =>
    onChange({ ...value, ranges: { ...value.ranges, [axis]: { ...value.ranges[axis], [end]: s } } });

  const shown: Drawing[] = value.drawings.map(d => ({ ...d, uploaded_at: "", uploaded_by: "", role: "vendor" }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px", border: "1px solid #E3E7E6", borderRadius: "10px", padding: "12px" }}>
      <div>
        <div style={{ fontSize: "13px", fontWeight: 600, color: "#343837" }}>For made-to-measure (optional)</div>
        <div style={{ fontSize: "12px", color: "#646968" }}>
          The sizes you usually make, and your product drawings. Shoppers see the sizes as guidance you confirm with them; nothing is enforced.
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "10px" }}>
        {SIZE_AXES.map(({ key, label }) => (
          <div key={key} style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", color: "#646968" }}>
            {label} (cm)
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <input aria-label={`${label} from`} inputMode="decimal" placeholder="from" value={value.ranges[key].min} onChange={e => setRange(key, "min", e.target.value)} style={inputStyle} />
              <span>–</span>
              <input aria-label={`${label} to`} inputMode="decimal" placeholder="to" value={value.ranges[key].max} onChange={e => setRange(key, "max", e.target.value)} style={inputStyle} />
            </div>
          </div>
        ))}
      </div>
      <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", color: "#646968" }}>
        Size note
        <textarea rows={2} maxLength={500} value={value.note} onChange={e => onChange({ ...value, note: e.target.value })}
          placeholder="e.g. Depth is usually 55–60 cm; other sizes on request. Heights above 2.4 m need a top filler."
          style={{ ...inputStyle, resize: "vertical" }} />
      </label>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <span style={{ fontSize: "12px", color: "#646968" }}>Product drawings (private: only you and Nooi see them)</span>
        <DrawingsList
          drawings={shown}
          compact
          empty="No drawings added."
          onAdd={async f => {
            const up = await uploadDrawingFile(f, { scope: "listing-draft" });
            const next = { ...latest.current, drawings: [...latest.current.drawings, { ...up, kind: drawingKind(up.name) ?? "pdf" as const }] };
            latest.current = next;
            onChange(next);
          }}
          onRemove={async d => {
            const next = { ...latest.current, drawings: latest.current.drawings.filter(x => x.path !== d.path) };
            latest.current = next;
            onChange(next);
          }}
        />
      </div>
    </div>
  );
}
