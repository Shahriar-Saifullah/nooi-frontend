"use client";

/**
 * Store logo — shown to shoppers on listings and in the vendor filter.
 * Uploads to vendor-assets and saves straight to the vendor profile (the
 * backend mirrors it onto the storefront).
 */

import React, { useEffect, useState } from "react";
import { requestApi } from "@/lib/api/http";
import { createClient } from "@/utils/supabase/client";

const MAX_BYTES = 2 * 1024 * 1024;

export async function uploadVendorAsset(file: File, assetType: "vendor_logo" | "product_certificate" | "option_swatch"): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("type", "asset");
  form.append("assetType", assetType);
  const headers: Record<string, string> = {};
  try {
    const { data: { session } } = await createClient().auth.getSession();
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  } catch { /* cookie auth still works */ }
  const res = await fetch("/api/vendor/upload", { method: "POST", headers, body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success || !data.url) throw new Error(data.error || "Upload failed");
  return data.url as string;
}

export default function StoreLogoField({ storeName }: { storeName: string }) {
  const [logo, setLogo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let live = true;
    requestApi<{ vendor: { logo_url?: string | null } }>({ path: "/vendor/profile", method: "GET" }).then(res => {
      if (live && res.success) setLogo(res.data.vendor?.logo_url ?? null);
    });
    return () => { live = false; };
  }, []);

  const save = async (url: string | null) => {
    const res = await requestApi({ path: "/vendor/profile", method: "PUT", body: { logo_url: url ?? "" } });
    if (!res.success) throw new Error(typeof res.error === "string" ? res.error : "Couldn't save the logo.");
    setLogo(url);
  };

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setMsg(null);
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) { setMsg({ ok: false, text: "Use a PNG, JPG or WebP image." }); return; }
    if (file.size > MAX_BYTES) { setMsg({ ok: false, text: "The logo must be under 2 MB." }); return; }
    setBusy(true);
    try {
      await save(await uploadVendorAsset(file, "vendor_logo"));
      setMsg({ ok: true, text: "Logo saved" });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Upload failed" });
    } finally {
      setBusy(false);
    }
  };

  const initials = storeName.split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase() || "N";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 500, color: "#343837" }}>
      Store logo
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 12, border: "1px solid #EAEDEC", background: "#FBFCFC",
          display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0,
        }}>
          {logo
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={logo} alt={`${storeName} logo`} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            : <span style={{ fontSize: 18, fontWeight: 600, color: "#8E9493" }}>{initials}</span>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <label style={{ color: "#004643", fontWeight: 600, cursor: busy ? "wait" : "pointer" }}>
              {busy ? "Uploading…" : logo ? "Change logo" : "Upload logo"}
              <input type="file" accept="image/png,image/jpeg,image/webp" hidden disabled={busy} onChange={e => { pick(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
            {logo && !busy && (
              <button type="button" onClick={() => save(null).then(() => setMsg({ ok: true, text: "Logo removed" })).catch(e => setMsg({ ok: false, text: e.message }))}
                style={{ background: "none", border: "none", color: "#B42318", fontSize: 12.5, cursor: "pointer", padding: 0 }}>
                Remove
              </button>
            )}
          </div>
          <span style={{ fontSize: 12, color: msg ? (msg.ok ? "#28603A" : "#B42318") : "#8E9493", fontWeight: 400 }}>
            {msg ? msg.text : "Square, at least 256 × 256 px. Shown on your listings."}
          </span>
        </div>
      </div>
    </div>
  );
}
