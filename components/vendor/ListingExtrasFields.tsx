"use client";

/**
 * Listing extras on the vendor's listing form — more categories, where it's
 * made, where it ships, certificates and patents. Controlled; the rules live
 * in lib/listings/extras.ts.
 */

import React, { useEffect, useRef } from "react";
import {
  SHOP_GROUPS, MAX_CERTIFICATES, MAX_PATENTS, groupOfVendorCategory,
  type ListingExtras, type Certificate, type Patent,
} from "@/lib/listings/extras";
import { COUNTRIES, SHIP_TO_CHOICES } from "@/lib/listings/countries";

const label: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontSize: 13, fontWeight: 500, color: "#343837" };
const input: React.CSSProperties = {
  padding: "9px 12px", border: "1px solid #D5DBDA", borderRadius: 8, fontSize: 13.5,
  background: "#FFFFFF", color: "#101212", outline: "none", minWidth: 0,
};
const hint: React.CSSProperties = { fontSize: 12, color: "#8E9493", fontWeight: 400 };
const chip = (on: boolean, locked = false): React.CSSProperties => ({
  border: `1px solid ${on ? "#004643" : "#D5DBDA"}`,
  background: on ? "#F3FEFD" : "#FFFFFF",
  color: on ? "#004643" : "#4B4F4F",
  borderRadius: 999, padding: "5px 12px", fontSize: 12.5,
  cursor: locked ? "default" : "pointer", opacity: locked ? 0.85 : 1,
});
const linkBtn: React.CSSProperties = { background: "none", border: "none", color: "#004643", fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: 0, alignSelf: "flex-start", justifySelf: "start" };
const removeBtn: React.CSSProperties = { background: "none", border: "none", color: "#B42318", fontSize: 12, cursor: "pointer", padding: "0 4px" };
const card: React.CSSProperties = { border: "1px solid #EAEDEC", borderRadius: 10, padding: 10, display: "grid", gap: 8, background: "#FBFCFC" };

export default function ListingExtrasFields({
  value, onChange, mainCategory, uploadFile,
}: {
  value: ListingExtras;
  onChange: (next: ListingExtras) => void;
  /** The form's main category — its group is always on. */
  mainCategory: string;
  /** Uploads a certificate file and returns its public URL. */
  uploadFile: (file: File) => Promise<string>;
}) {
  const set = (patch: Partial<ListingExtras>) => onChange({ ...value, ...patch });
  const mainGroup = groupOfVendorCategory(mainCategory);

  const toggleGroup = (g: string) => {
    if (g === mainGroup) return;
    const has = value.categories.includes(g);
    set({ categories: has ? value.categories.filter(x => x !== g) : [...value.categories, g] });
  };
  const toggleShip = (c: string) => {
    const has = value.ships_to.includes(c);
    set({ ships_to: has ? value.ships_to.filter(x => x !== c) : [...value.ships_to, c] });
  };

  const setCert = (i: number, patch: Partial<Certificate>) =>
    set({ certificates: value.certificates.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  const setPatent = (i: number, patch: Partial<Patent>) =>
    set({ patents: value.patents.map((p, j) => (j === i ? { ...p, ...patch } : p)) });

  // The latest value, for uploads that finish after more edits.
  const latest = useRef(value);
  useEffect(() => { latest.current = value; }, [value]);

  const attach = async (i: number, file: File | undefined) => {
    if (!file) return;
    setCert(i, { uploading: true });
    try {
      const url = await uploadFile(file);
      const cur = latest.current;
      onChange({ ...cur, certificates: cur.certificates.map((c, j) => (j === i ? { ...c, url, uploading: false, name: c.name || file.name.replace(/\.[^.]+$/, "") } : c)) });
    } catch (e) {
      const cur = latest.current;
      onChange({ ...cur, certificates: cur.certificates.map((c, j) => (j === i ? { ...c, uploading: false } : c)) });
      alert(e instanceof Error ? e.message : "Upload failed");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Categories */}
      <div style={label}>
        Also show under
        <span style={hint}>Pick every category shoppers might look in. The main category is always included.</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
          {SHOP_GROUPS.map(g => {
            const locked = g === mainGroup;
            const on = locked || value.categories.includes(g);
            return (
              <button key={g} type="button" onClick={() => toggleGroup(g)} style={chip(on, locked)} aria-pressed={on}>
                {on ? "✓ " : ""}{g}{locked ? " · main" : ""}
              </button>
            );
          })}
        </div>
      </div>

      {/* Origin */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
        <label style={label}>
          Made in
          <select
            value={value.origin}
            onChange={e => set(e.target.value === "saudi"
              ? { origin: "saudi", origin_country: "SA" }
              : { origin: "international", origin_country: value.origin_country === "SA" ? "" : value.origin_country })}
            style={{ ...input, cursor: "pointer" }}
          >
            <option value="saudi">Saudi Arabia (local)</option>
            <option value="international">Outside Saudi Arabia (imported)</option>
          </select>
        </label>
        {value.origin === "international" && (
          <label style={label}>
            Country of origin
            <select value={value.origin_country} onChange={e => set({ origin_country: e.target.value })} style={{ ...input, cursor: "pointer" }}>
              <option value="">Choose</option>
              {Object.entries(COUNTRIES).filter(([c]) => c !== "SA").map(([c, n]) => (
                <option key={c} value={c}>{n.en}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {/* Ships to */}
      <div style={label}>
        Ships to
        <span style={hint}>Shoppers in other countries can&apos;t check out with this listing.</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
          {SHIP_TO_CHOICES.map(c => {
            const on = value.ships_to.includes(c);
            return (
              <button key={c} type="button" onClick={() => toggleShip(c)} style={chip(on)} aria-pressed={on}>
                {on ? "✓ " : ""}{COUNTRIES[c].en}
              </button>
            );
          })}
        </div>
      </div>

      {/* Certificates */}
      <div style={label}>
        Certificates
        <span style={hint}>SASO, ISO, FSC, fire rating, origin certificate… Attach the PDF or a photo.</span>
        <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
          {value.certificates.map((c, i) => (
            <div key={i} style={card}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
                <input style={input} placeholder="Name, e.g. SASO conformity" value={c.name} onChange={e => setCert(i, { name: e.target.value })} />
                <input style={input} placeholder="Issued by (optional)" value={c.issuer ?? ""} onChange={e => setCert(i, { issuer: e.target.value })} />
                <input style={input} placeholder="Certificate no. (optional)" value={c.number ?? ""} onChange={e => setCert(i, { number: e.target.value })} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 12.5, color: "#4B4F4F", fontWeight: 400 }}>
                <span>Expires</span>
                <input type="date" style={{ ...input, padding: "6px 10px" }} value={c.expires ?? ""} onChange={e => setCert(i, { expires: e.target.value })} />
                {c.uploading ? (
                  <span>Uploading…</span>
                ) : c.url ? (
                  <a href={c.url} target="_blank" rel="noreferrer" style={{ color: "#004643" }}>View file</a>
                ) : null}
                <label style={{ ...linkBtn, display: "inline-block" }}>
                  {c.url ? "Replace file" : "Attach file"}
                  <input type="file" accept="application/pdf,image/jpeg,image/png" hidden onChange={e => attach(i, e.target.files?.[0])} />
                </label>
                <span style={{ flex: 1 }} />
                <button type="button" style={removeBtn} onClick={() => set({ certificates: value.certificates.filter((_, j) => j !== i) })}>Remove</button>
              </div>
            </div>
          ))}
          {value.certificates.length < MAX_CERTIFICATES && (
            <button type="button" style={linkBtn} onClick={() => set({ certificates: [...value.certificates, { name: "" }] })}>
              + Add certificate
            </button>
          )}
        </div>
      </div>

      {/* Patents */}
      <div style={label}>
        Patents &amp; registered designs
        <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
          {value.patents.map((p, i) => (
            <div key={i} style={{ ...card, gridTemplateColumns: "minmax(0,1fr) minmax(0,1.4fr) 110px auto", alignItems: "center" }}>
              <input style={input} placeholder="Patent / design no." value={p.number} onChange={e => setPatent(i, { number: e.target.value })} />
              <input style={input} placeholder="What it covers (optional)" value={p.title ?? ""} onChange={e => setPatent(i, { title: e.target.value })} />
              <select style={{ ...input, cursor: "pointer" }} value={p.country ?? ""} onChange={e => setPatent(i, { country: e.target.value })}>
                <option value="">Country</option>
                {Object.entries(COUNTRIES).map(([code, n]) => <option key={code} value={code}>{n.en}</option>)}
              </select>
              <button type="button" style={removeBtn} onClick={() => set({ patents: value.patents.filter((_, j) => j !== i) })}>Remove</button>
            </div>
          ))}
          {value.patents.length < MAX_PATENTS && (
            <button type="button" style={linkBtn} onClick={() => set({ patents: [...value.patents, { number: "" }] })}>
              + Add patent
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
