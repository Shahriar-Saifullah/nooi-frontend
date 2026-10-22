/**
 * Fast picking with three-mesh-bvh — lib/three/bvh.ts
 * ============================================================================
 * Every hover, click and drag in the 3D view raycasts the scene. three.js's
 * default raycast tests every triangle of every mesh it reaches, and a single
 * furniture model can have tens of thousands; a furnished plan made pointer
 * moves visibly lag. A bounds tree (BVH) per geometry turns that into a few
 * dozen box tests.
 *
 * installBvh() swaps Mesh.prototype.raycast for the accelerated one. It falls
 * back to the normal test for any geometry without a tree, so nothing that
 * was hit before stops being hit; meshes that opt out with their own
 * `raycast` (labels, handles) are untouched.
 *
 * Trees are built only for heavy geometry (the furniture models) and once per
 * GEOMETRY: useGLTF shares geometry between every copy of a model, so the
 * second sofa costs nothing. They are never disposed for the same reason —
 * the geometry outlives any one item.
 */

import * as THREE from "three";
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from "three-mesh-bvh";

let installed = false;

export function installBvh() {
  if (installed) return;
  installed = true;
  THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
  THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
  THREE.Mesh.prototype.raycast = acceleratedRaycast;
}

/** Below this the plain triangle loop is as fast as walking a tree. */
const MIN_TRIANGLES = 512;

function triangleCount(g: THREE.BufferGeometry): number {
  const n = g.index ? g.index.count : g.attributes.position?.count ?? 0;
  return Math.floor(n / 3);
}

/** Build trees for the heavy meshes under `root` that do not have one. */
export function buildBoundsTrees(root: THREE.Object3D) {
  installBvh();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || (mesh as THREE.SkinnedMesh).isSkinnedMesh) return;
    const g = mesh.geometry;
    if (!g || g.boundsTree || !g.attributes.position) return;
    if (triangleCount(g) < MIN_TRIANGLES) return;
    g.computeBoundsTree();
  });
}
