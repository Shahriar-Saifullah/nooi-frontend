/**
 * Screen-space ink lines for the WebGPU pipeline — components/webgpu/inkEdges.ts
 * ============================================================================
 * Adapted from Pascal's viewer (packages/viewer/src/lib/ink-edges.ts in
 * github.com/pascalorg/editor), used under the MIT License:
 *
 *   Copyright (c) 2026 Pascal Group Inc.
 *
 *   Permission is hereby granted, free of charge, to any person obtaining a
 *   copy of this software and associated documentation files (the
 *   "Software"), to deal in the Software without restriction, including
 *   without limitation the rights to use, copy, modify, merge, publish,
 *   distribute, sublicense, and/or sell copies of the Software, and to permit
 *   persons to whom the Software is furnished to do so, subject to the
 *   following conditions:
 *
 *   The above copyright notice and this permission notice shall be included
 *   in all copies or substantial portions of the Software.
 *
 *   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 *   OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 *   MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
 *   NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 *   DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 *   OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
 *   USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 * Two signals, both read from the scene pass's depth and normal targets:
 *
 *   1. Crease — 1 - dot(centre normal, neighbour normal): 0 on a flat
 *      surface, ~1 at a right-angle corner (wall meets floor).
 *   2. Depth — Laplacian of raw depth, which is linear across planes on
 *      screen and so ~0 on any flat surface, normalised by (1 - depth)^2 so a
 *      given world-space step reads the same near and far.
 *
 * Depth is remapped to a fixed near 0.1 / far 1000 before measuring, so the
 * thresholds keep their meaning when the camera's clip planes change (orbit
 * vs walkthrough).
 */

import type * as THREE from "three";
import {
  abs, float, max, min, mix, perspectiveDepthToViewZ, screenSize, screenUV,
  smoothstep, uniform, unpackRGBToNormal, vec2, viewZToPerspectiveDepth,
} from "three/tsl";

/* TSL's TypeScript overloads lag the runtime; the node graph is checked by
   three when the pipeline compiles, so `any` is used at the node boundary. */
/* eslint-disable @typescript-eslint/no-explicit-any */
type Node = any;

export function createEdgeDepthSampler(depthTex: Node, camera: THREE.Camera) {
  const cam = camera as THREE.PerspectiveCamera;
  if (!cam.isPerspectiveCamera) return (uv: Node) => depthTex.sample(uv).r;
  const near = uniform(cam.near).onRenderUpdate(() => cam.near);
  const far = uniform(cam.far).onRenderUpdate(() => cam.far);
  return (uv: Node) =>
    viewZToPerspectiveDepth(
      perspectiveDepthToViewZ(depthTex.sample(uv).r, near, far),
      float(0.1),
      float(1000),
    );
}

export function inkedEdges({
  sceneRgb, sampleDepth, normalTex, inkColor, radius, opacity,
}: {
  sceneRgb: Node;
  sampleDepth: (uv: Node) => Node;
  normalTex: Node;
  inkColor: Node;
  /** Line half-width in pixels. */
  radius: number;
  /** 0–1, or a uniform node. */
  opacity: Node;
}): Node {
  const px = vec2(1, 1).div(screenSize).mul(radius);
  const uv = screenUV;

  const dC = sampleDepth(uv);
  const dR = sampleDepth(uv.add(vec2(px.x, 0)));
  const dL = sampleDepth(uv.sub(vec2(px.x, 0)));
  const dU = sampleDepth(uv.add(vec2(0, px.y)));
  const dD = sampleDepth(uv.sub(vec2(0, px.y)));

  const depthLap = abs(dR.add(dL).add(dU).add(dD).sub(dC.mul(4)));
  const invDepth = float(1).sub(dC);
  const depthMetric = depthLap.div(invDepth.mul(invDepth).add(float(0.00002)));
  // reject the quantisation noise of far, flat planes
  const noiseGate = smoothstep(float(0.00002), float(0.00006), depthLap);
  // roughly: a 5 cm step starts a line, 25 cm is solid
  const depthEdge = smoothstep(float(0.5), float(2.5), depthMetric).mul(noiseGate);

  // 8-bit normals decode to non-unit vectors; re-normalise or creases fade
  const n = (o: Node) => (unpackRGBToNormal as any)(normalTex.sample(o)).normalize();
  const nC = n(uv);
  const nDiff = max(
    max(float(1).sub(nC.dot(n(uv.add(vec2(px.x, 0))))), float(1).sub(nC.dot(n(uv.sub(vec2(px.x, 0)))))),
    max(float(1).sub(nC.dot(n(uv.add(vec2(0, px.y))))), float(1).sub(nC.dot(n(uv.sub(vec2(0, px.y)))))),
  );
  // Pascal's 0.01–0.05 suits low-poly architecture. Nooi's furniture GLBs are
  // dense and finely curved (tufted sofas, turned legs), and at those values
  // every facet inked — the sofa read as a pencil sketch. 0.12–0.35 keeps real
  // creases (≈30°+) and ignores smooth curvature.
  const normalEdge = smoothstep(float(0.12), float(0.35), nDiff);

  // fade out in the far field (≈150 m → 350 m at the normalised clip range)
  const distanceFade = float(1).sub(smoothstep(float(0.9994), float(0.9998), dC));

  const mask = min(max(depthEdge, normalEdge).mul(opacity).mul(distanceFade), float(1));
  return (mix as any)(sceneRgb, inkColor, mask);
}
