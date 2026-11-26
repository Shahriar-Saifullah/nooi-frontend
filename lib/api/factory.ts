/**
 * Factory files API (backend routes/factory.routes.ts): DWG / DXF / PDF
 * drawings on listings and order lines, and each order line's factory spec.
 *
 * Uploads go straight from the browser to storage with a signed upload URL
 * (a DWG can be 10 MB+, too big to pass through our API), then the file is
 * attached to its listing or order line.
 */
import { requestApi, type ApiResponse } from "@/lib/api/http";
import { createClient } from "@/utils/supabase/client";

export type DrawingKind = "dwg" | "dxf" | "pdf";
export interface Drawing {
  path: string;
  name: string;
  size: number;
  kind: DrawingKind;
  uploaded_at: string;
  uploaded_by: string;
  role: "vendor" | "customer" | "admin";
  url?: string | null;
}

export interface SpecField { key: string; label: string; zh: string }
export interface FactorySpec { fields: Record<string, string>; updated_at?: string; updated_by?: string }

export interface FactoryLine {
  id: string;
  product_id: string | null;
  title: string;
  quantity: number;
  item_status: string | null;
  config_label: string | null;
  spec: FactorySpec;
  drawings: Drawing[];
  can_edit_spec: boolean;
  can_attach: boolean;
}

export const MAX_DRAWING_MB = 50;
export const DRAWING_ACCEPT = ".dwg,.dxf,.pdf";

export function drawingKind(name: string): DrawingKind | null {
  const ext = name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  return ext === "dwg" || ext === "dxf" || ext === "pdf" ? ext : null;
}

export function fileProblem(f: File): string | null {
  if (!drawingKind(f.name)) return "Only DWG, DXF or PDF files can be attached.";
  if (f.size <= 0) return "That file is empty.";
  if (f.size > MAX_DRAWING_MB * 1024 * 1024) return `Each file must be under ${MAX_DRAWING_MB} MB.`;
  return null;
}

export type UploadTarget = { scope: "listing"; id: string } | { scope: "listing-draft" } | { scope: "order-item"; id: string };

/** Upload one file to storage; returns what to attach (path, name, size). */
export async function uploadDrawingFile(file: File, target: UploadTarget): Promise<{ path: string; name: string; size: number }> {
  const problem = fileProblem(file);
  if (problem) throw new Error(problem);
  const signed = await requestApi<{ bucket: string; path: string; token: string }>({
    path: "/factory/uploads", method: "POST",
    body: { scope: target.scope, id: "id" in target ? target.id : undefined, name: file.name, size: file.size },
  });
  if (!signed.success) throw new Error(typeof signed.error === "string" && signed.error ? signed.error : "Could not start the upload.");
  const { bucket, path, token } = signed.data;
  const { error } = await createClient().storage.from(bucket).uploadToSignedUrl(path, token, file, {
    contentType: file.type || "application/octet-stream",
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return { path, name: file.name, size: file.size };
}

function unwrap<T>(r: ApiResponse<T>): T {
  if (!r.success) throw new Error(typeof r.error === "string" && r.error ? r.error : "Something went wrong.");
  return r.data;
}

export const listingDrawings = (id: string) =>
  requestApi<{ drawings: Drawing[] }>({ path: `/factory/listings/${id}/drawings` }).then(unwrap).then(d => d.drawings);

export async function attachListingDrawing(id: string, file: File): Promise<Drawing[]> {
  const up = await uploadDrawingFile(file, { scope: "listing", id });
  return unwrap(await requestApi<{ drawings: Drawing[] }>({ path: `/factory/listings/${id}/drawings`, method: "POST", body: up })).drawings;
}

export const removeListingDrawing = (id: string, path: string) =>
  requestApi<{ drawings: Drawing[] }>({ path: `/factory/listings/${id}/drawings?path=${encodeURIComponent(path)}`, method: "DELETE" }).then(unwrap).then(d => d.drawings);

export const orderFactoryLines = (orderId: string) =>
  requestApi<{ role: "customer" | "vendor" | "admin"; items: FactoryLine[]; fields: SpecField[] }>({ path: `/factory/orders/${orderId}` }).then(unwrap);

export async function attachLineDrawing(itemId: string, file: File): Promise<Drawing[]> {
  const up = await uploadDrawingFile(file, { scope: "order-item", id: itemId });
  return unwrap(await requestApi<{ drawings: Drawing[] }>({ path: `/factory/order-items/${itemId}/drawings`, method: "POST", body: up })).drawings;
}

export const removeLineDrawing = (itemId: string, path: string) =>
  requestApi<{ drawings: Drawing[] }>({ path: `/factory/order-items/${itemId}/drawings?path=${encodeURIComponent(path)}`, method: "DELETE" }).then(unwrap).then(d => d.drawings);

export const saveLineSpec = (itemId: string, fields: Record<string, string>) =>
  requestApi<{ spec: FactorySpec }>({ path: `/factory/order-items/${itemId}/spec`, method: "PUT", body: { fields } }).then(unwrap).then(d => d.spec);

export const formatBytes = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
