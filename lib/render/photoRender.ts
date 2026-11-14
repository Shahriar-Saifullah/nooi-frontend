/**
 * Photo render, browser side — lib/render/photoRender.ts
 * ============================================================================
 * Export → compress → upload → start → wait. The GPU side is described in
 * the backend's services/render.service.ts.
 *
 * The scene is identified by the SHA-256 of its GLB: rendering the same room
 * again from another angle finds it already uploaded and skips the upload,
 * which for a furnished home is tens of megabytes.
 */

import { createRender, getRender, startRender, type PhotoRender } from "@/lib/api/renders";
import type { RenderQuality, RenderSpec } from "@/lib/render/sceneSpec";

export type PhotoRenderStage = "exporting" | "uploading" | "queued" | "running";

const errorText = (e: unknown, fallback: string) =>
  typeof e === "string" ? e : e instanceof Error ? e.message : fallback;

export async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, "0")).join("");
}

/** gzip in the browser. Geometry halves; textures are already compressed. */
export async function gzip(data: ArrayBuffer): Promise<Blob> {
  if (typeof CompressionStream === "undefined") return new Blob([data]);
  const stream = new Blob([data]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Response(stream).blob();
}

export function isTerminal(s: PhotoRender["status"]) {
  return s === "done" || s === "failed" || s === "cancelled";
}

/**
 * Start a photo render. Resolves once the GPU has the job (the image comes
 * later; follow it with waitForRender).
 */
export async function requestPhotoRender(opts: {
  projectId: string;
  quality: RenderQuality;
  exportGlb: () => Promise<Blob | null>;
  spec: RenderSpec;
  onStage?: (s: PhotoRenderStage) => void;
}): Promise<PhotoRender> {
  opts.onStage?.("exporting");
  const glb = await opts.exportGlb();
  if (!glb) throw new Error("Could not prepare the scene.");
  const raw = await glb.arrayBuffer();
  const sceneHash = await sha256Hex(raw);

  const created = await createRender({
    projectId: opts.projectId, quality: opts.quality, spec: opts.spec, sceneHash, sceneBytes: raw.byteLength,
  });
  if (!created.success) throw new Error(errorText(created.error, "Could not start the render."));
  const { job, upload } = created.data;

  if (upload) {
    opts.onStage?.("uploading");
    const body = await gzip(raw);
    const res = await fetch(upload.url, {
      method: "PUT",
      headers: { "Content-Type": "application/gzip", "x-upsert": "true" },
      body,
    });
    if (!res.ok) throw new Error("The scene upload failed. Please try again.");
  }

  const started = await startRender(job.id);
  if (!started.success) throw new Error(errorText(started.error, "Could not start the render."));
  opts.onStage?.(started.data.job.status === "running" ? "running" : "queued");
  return started.data.job;
}

/** Poll until the render finishes (or `signal` aborts). */
export async function waitForRender(
  id: string,
  onUpdate: (j: PhotoRender) => void,
  signal?: AbortSignal,
  everyMs = 4000,
  maxMs = 20 * 60 * 1000,
): Promise<PhotoRender> {
  const until = Date.now() + maxMs;
  for (;;) {
    if (Date.now() > until) throw new Error("This render is taking longer than usual. It will appear here when it's ready.");
    if (signal?.aborted) throw new DOMException("aborted", "AbortError");
    await new Promise(r => setTimeout(r, everyMs));
    const res = await getRender(id);
    if (!res.success) continue; // a blip; try again
    onUpdate(res.data.job);
    if (isTerminal(res.data.job.status)) return res.data.job;
  }
}
