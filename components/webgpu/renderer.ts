"use client";

/**
 * WebGPU renderer for the R3F <Canvas> — components/webgpu/renderer.ts
 * ============================================================================
 * R3F accepts an async `gl` factory; WebGPURenderer must `await init()` before
 * its first frame. Two details that matter:
 *
 *  - The factory can be called more than once for the same canvas (React
 *    strict mode, R3F reconfiguring). Creating a second renderer on a canvas
 *    whose context the first one already configured fails, so the promise is
 *    cached per canvas.
 *  - WebGPURenderer silently falls back to its own WebGL2 backend when WebGPU
 *    is unavailable. We do not want that half-way state — the classic WebGL
 *    path is better tested — so that case, a failed init, and a lost device
 *    all hand over to markWebGPUFailed(), which remounts the canvas on WebGL.
 */

import * as THREE from "three";
import { WebGPURenderer } from "three/webgpu";
import { markWebGPUFailed } from "@/lib/three/rendererBackend";

const cache = new WeakMap<HTMLCanvasElement, Promise<WebGPURenderer>>();

/** Never settles. R3F awaits the factory inside its own configure() with no
 *  catch, so rejecting would surface as an unhandled rejection; resolving with
 *  a dead renderer would crash its first frame. The backend switch unmounts
 *  this canvas, which releases the pending configure. */
const never = () => new Promise<never>(() => undefined);

export function webgpuGlFactory(props: { canvas: HTMLCanvasElement | OffscreenCanvas }) {
  const canvas = props.canvas as HTMLCanvasElement;
  const cached = cache.get(canvas);
  if (cached) return cached;

  const promise = (async () => {
    const renderer = new WebGPURenderer({
      ...(props as object),
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });

    try {
      await renderer.init();
    } catch (error) {
      cache.delete(canvas);
      renderer.dispose();
      markWebGPUFailed(error);
      return never();
    }

    if (!(renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend) {
      cache.delete(canvas);
      renderer.dispose();
      markWebGPUFailed("WebGPURenderer fell back to its WebGL2 backend");
      return never();
    }

    // three r185 passes `swizzle: "rgba"` on every texture view. Browsers
    // from before that field settled (e.g. Chromium 141) reject it with a
    // TypeError on the first frame. Found by testing on such a build: probe
    // for it here and stay on WebGL instead of rendering a blank canvas.
    if (!acceptsViewSwizzle(renderer)) {
      cache.delete(canvas);
      renderer.dispose();
      markWebGPUFailed("browser rejects texture-view swizzle (WebGPU implementation too old)");
      return never();
    }

    renderer.onDeviceLost = (info: unknown) => markWebGPUFailed(info);

    // Same output curve as the WebGL path. With the render pipeline mounted
    // this is applied once at the very end (outputColorTransform), after AO,
    // ink and the grade — not per material.
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    return renderer;
  })();

  cache.set(canvas, promise);
  return promise;
}

function acceptsViewSwizzle(renderer: WebGPURenderer): boolean {
  // Minimal shape of the WebGPU device — the project does not include the
  // @webgpu/types ambient declarations.
  type ProbeTexture = { createView(d: object): unknown; destroy(): void };
  const device = (renderer.backend as unknown as {
    device?: { createTexture(d: object): ProbeTexture };
  }).device;
  if (!device) return false;
  try {
    const t = device.createTexture({
      size: [1, 1],
      format: "rgba8unorm",
      usage: 0x04, // GPUTextureUsage.TEXTURE_BINDING
    });
    try {
      t.createView({ swizzle: "rgba" });
    } finally {
      t.destroy();
    }
    return true;
  } catch {
    return false;
  }
}
