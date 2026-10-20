"use client";

/**
 * Which renderer the 3D canvas uses — lib/three/rendererBackend.ts
 * ============================================================================
 * WebGPU when the browser has a working adapter, WebGL otherwise. Decided once
 * per page load and shared, so the canvas and the toolbar (which hides the
 * WebGL-only path tracer) always agree.
 *
 * Override for testing and comparison:
 *   ?renderer=webgl    force the classic WebGL path
 *   ?renderer=webgpu   force WebGPU (fails over to WebGL if init fails)
 *
 * If WebGPU is chosen but the renderer then fails to initialise (driver
 * blocklist, lost device, a GPU process crash), call markWebGPUFailed(): every
 * subscriber switches to WebGL and the canvas remounts on the classic path.
 */

import { useEffect, useState } from "react";

export type RendererBackend = "webgpu" | "webgl";

const ADAPTER_TIMEOUT_MS = 3000;

let detection: Promise<RendererBackend> | null = null;
let failedOver = false;
const listeners = new Set<(b: RendererBackend) => void>();

function urlOverride(): RendererBackend | null {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("renderer");
  return v === "webgl" || v === "webgpu" ? v : null;
}

async function detect(): Promise<RendererBackend> {
  const forced = urlOverride();
  if (forced) return forced;

  const gpu = (navigator as Navigator & {
    gpu?: { requestAdapter(o?: object): Promise<unknown | null> };
  }).gpu;
  if (!gpu) return "webgl";

  try {
    const adapter = await Promise.race([
      gpu.requestAdapter({ powerPreference: "high-performance" }),
      new Promise<null>(resolve => setTimeout(() => resolve(null), ADAPTER_TIMEOUT_MS)),
    ]);
    return adapter ? "webgpu" : "webgl";
  } catch {
    return "webgl";
  }
}

export function detectRendererBackend(): Promise<RendererBackend> {
  if (failedOver) return Promise.resolve("webgl");
  detection ??= detect();
  return detection;
}

/** WebGPU was picked but the renderer could not start. Switch everyone over. */
export function markWebGPUFailed(error?: unknown) {
  if (failedOver) return;
  failedOver = true;
  detection = Promise.resolve("webgl");
  console.warn("[renderer] WebGPU failed to start; falling back to WebGL.", error);
  for (const l of listeners) l("webgl");
}

/** null while detecting (the first few ms of a page load), then the backend. */
export function useRendererBackend(): RendererBackend | null {
  const [backend, setBackend] = useState<RendererBackend | null>(null);
  useEffect(() => {
    let alive = true;
    detectRendererBackend().then(b => { if (alive) setBackend(b); });
    const onFail = (b: RendererBackend) => setBackend(b);
    listeners.add(onFail);
    return () => { alive = false; listeners.delete(onFail); };
  }, []);
  return backend;
}
