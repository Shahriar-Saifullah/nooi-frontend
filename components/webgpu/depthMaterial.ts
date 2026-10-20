/**
 * Linear depth for the AI render's ControlNet conditioning, WebGPU version.
 * The WebGL path uses a ShaderMaterial with GLSL, which WebGPU cannot run;
 * this is the same mapping as a node material: near = white, far = black.
 */

import * as THREE from "three";
import { MeshBasicNodeMaterial } from "three/webgpu";
import { clamp, float, positionView, vec3 } from "three/tsl";

export function createDepthNodeMaterial(near: number, far: number) {
  const m = new MeshBasicNodeMaterial({ side: THREE.DoubleSide });
  const d = clamp(positionView.z.negate().sub(near).div(far - near), 0, 1);
  m.colorNode = vec3(float(1).sub(d));
  m.toneMapped = false;
  return m;
}
