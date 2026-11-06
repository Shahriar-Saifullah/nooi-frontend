"use client";

/**
 * Asks a vendor, factory or Nooi employee to accept the current version of
 * their documents — once, and again whenever a version changes. Renders
 * nothing when everything is accepted, or when nobody is signed in.
 */

import React, { useEffect, useState } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { getTermsStatus, acceptTerms } from "@/lib/api/terms";
import { DOC_TITLE, ROLE_LABEL, docHref, type TermsDocument, type TermsRole } from "@/lib/legal/terms";

export default function TermsGate({ context, onAccepted }: { context: string; onAccepted?: () => void }) {
  const [missing, setMissing] = useState<TermsDocument[]>([]);
  const [role, setRole] = useState<TermsRole | null>(null);
  const [ticked, setTicked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    getTermsStatus().then(res => {
      if (!live || !res.success) return;
      setRole(res.data.role);
      setMissing(res.data.missing);
    });
    return () => { live = false; };
  }, []);

  if (!role || missing.length === 0) return null;

  const accept = async () => {
    setBusy(true);
    setError("");
    const res = await acceptTerms({ documents: missing, context });
    setBusy(false);
    if (!res.success) { setError(typeof res.error === "string" ? res.error : "Couldn't save. Please try again."); return; }
    setMissing(res.data.missing);
    if (!res.data.missing.length) onAccepted?.();
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="terms-gate-title"
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(16,18,18,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#FFFFFF", borderRadius: 16, maxWidth: 480, width: "100%", padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ShieldCheck size={20} color="#004643" />
          <h2 id="terms-gate-title" style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#101212" }}>
            Please review and accept
          </h2>
        </div>
        <p style={{ fontSize: 13.5, color: "#4B4F4F", marginTop: 10, lineHeight: 1.5 }}>
          As a {ROLE_LABEL[role].toLowerCase()} on Nooi, you need to accept the current version of:
        </p>
        <ul style={{ margin: "8px 0 0", paddingInlineStart: 18, fontSize: 13.5, lineHeight: 1.9 }}>
          {missing.map(d => (
            <li key={d}>
              <a href={docHref(d)} target="_blank" rel="noreferrer" style={{ color: "#004643", fontWeight: 500 }}>{DOC_TITLE[d].en}</a>
            </li>
          ))}
        </ul>
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 16, fontSize: 13, color: "#343837", cursor: "pointer" }}>
          <input type="checkbox" checked={ticked} onChange={e => setTicked(e.target.checked)} style={{ marginTop: 2 }} />
          I have read and accept these documents.
        </label>
        {error && <p style={{ color: "#B42318", fontSize: 12.5, marginTop: 10 }}>{error}</p>}
        <button
          type="button"
          disabled={!ticked || busy}
          onClick={accept}
          style={{
            marginTop: 18, width: "100%", background: "#004643", color: "#FFFFFF", border: "none", borderRadius: 10,
            padding: "11px 16px", fontSize: 14, fontWeight: 600, cursor: ticked && !busy ? "pointer" : "not-allowed",
            opacity: ticked && !busy ? 1 : 0.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          {busy && <Loader2 size={15} className="animate-spin" />} Accept and continue
        </button>
        <p style={{ fontSize: 11.5, color: "#8E9493", marginTop: 10, textAlign: "center" }}>
          We record the version, date, IP address and browser of your acceptance.
        </p>
      </div>
    </div>
  );
}
