"use client";

/**
 * Under a listing row on the vendor's Products page:
 *   - changes requested / taken off sale → Nooi's note, and "Edit and resubmit"
 * Every resubmission goes back into Nooi's review queue (/admin/listings).
 */

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

export type ListingUiStatus = "pending_review" | "live" | "changes_requested" | "draft" | "deactivated";

/** products.listing_status → the statuses the vendor Products page shows. */
export function listingUiStatus(s: string | null | undefined): ListingUiStatus {
  switch (s) {
    case "approved": return "live";
    case "rejected": return "changes_requested";
    case "deactivated": return "deactivated";
    default: return "pending_review";
  }
}

async function patchListing(body: Record<string, unknown>) {
  const supabase = createClient();
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  const res = await fetch("/api/vendor/listings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) throw new Error(data.error || "Could not update the listing.");
  return data.product as { title: string; base_price: number; listing_status: string };
}

export default function ListingReviewActions({
  product,
  onChanged,
}: {
  product: { id: string; title: string; price: string; status: ListingUiStatus; reviewNote: string | null };
  onChanged: (next: { title: string; price: string; status: ListingUiStatus; reviewNote: null }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(product.title);
  const [price, setPrice] = useState(product.price);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: "resubmit") => {
    setBusy(true); setError(null);
    try {
      const p = await patchListing({
        id: product.id, action,
        title, price, ...(description.trim() ? { description } : {}),
      });
      setEditing(false);
      onChanged({ title: p.title, price: String(p.base_price), status: listingUiStatus(p.listing_status), reviewNote: null });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the listing.");
    } finally {
      setBusy(false);
    }
  };

  const box: React.CSSProperties = { margin: "0 20px 12px 68px", padding: "10px 12px", borderRadius: "8px", fontSize: "12.5px" };
  const btn: React.CSSProperties = { border: "1px solid #D5DBDA", background: "#FFFFFF", borderRadius: "8px", padding: "6px 12px", fontSize: "12px", fontWeight: 600, color: "#004643", cursor: "pointer" };
  const field: React.CSSProperties = { width: "100%", border: "1px solid #D5DBDA", borderRadius: "8px", padding: "7px 10px", fontSize: "13px", marginTop: "4px" };

  return (
    <div style={{ ...box, background: product.status === "changes_requested" ? "#FFF1F2" : "#F8FAFC", color: "#343837" }}>
      {product.reviewNote && (
        <div><b>{product.status === "changes_requested" ? "Nooi asked for changes:" : "Taken off sale:"}</b> {product.reviewNote}</div>
      )}
      {!editing ? (
        <button type="button" style={{ ...btn, marginTop: "8px" }} onClick={() => setEditing(true)}>Edit and resubmit</button>
      ) : (
        <div style={{ marginTop: "8px", display: "grid", gap: "8px" }}>
          <label>Title<input style={field} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
          <label>Price (SAR)<input style={field} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} /></label>
          <label>Description (leave empty to keep the current one)
            <textarea style={field} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <span style={{ fontSize: "11.5px", color: "#646968" }}>To change photos or options, create a new listing.</span>
          <div style={{ display: "flex", gap: "8px" }}>
            <button type="button" disabled={busy} onClick={() => void run("resubmit")}
              style={{ ...btn, background: "#004643", color: "#FFFFFF", border: "none" }}>
              {busy ? "Sending…" : "Send for review"}
            </button>
            <button type="button" style={{ ...btn, color: "#646968" }} onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      )}
      {error && <div style={{ color: "#812F28", marginTop: "6px" }}>{error}</div>}
    </div>
  );
}
