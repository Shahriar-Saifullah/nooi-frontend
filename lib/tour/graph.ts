/**
 * 360° tour layout — lib/tour/graph.ts
 * ============================================================================
 * Where each room's panorama is taken from, and which rooms a visitor can walk
 * to from it. Works on the 3D scene's floor coordinates (x, z). Pure, so the
 * tests share it.
 *
 *   node    one per room: a point well inside it, at eye height
 *   link    two rooms are linked when a door (or open passage) sits on the
 *           wall between them; the pin is drawn towards that doorway
 *   plan    the rooms' outlines, for the floor-plan map in the viewer
 *
 * A room that no door reaches (an open-plan kitchen drawn as its own room, a
 * plan with doors missing) is linked to the room it shares the most outline
 * with, so nobody gets stranded.
 */

export type XZ = [number, number];

export interface TourRoomIn { id: string; name: string; poly: XZ[] }
export interface TourDoorIn { x: number; z: number; /** how far either side of the wall still counts */ reach: number }

export interface TourLinkOut { to: string; at: XZ }
export interface TourNodeOut { id: string; roomId: string; name: string; position: [number, number, number]; links: TourLinkOut[] }
export interface TourPlanOut { rooms: { id: string; name: string; poly: XZ[] }[]; bounds: [number, number, number, number] }

export function polygonArea(poly: XZ[]): number {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += (poly[j][0] + poly[i][0]) * (poly[j][1] - poly[i][1]);
  return Math.abs(a / 2);
}

export function inside(x: number, z: number, poly: XZ[]): boolean {
  let r = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) r = !r;
  }
  return r;
}

function segDist(px: number, pz: number, a: XZ, b: XZ): number {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const l2 = dx * dx + dz * dz;
  const t = l2 ? Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / l2)) : 0;
  return Math.hypot(px - (a[0] + t * dx), pz - (a[1] + t * dz));
}

/** Distance from a point to a polygon's outline. */
export function edgeDistance(x: number, z: number, poly: XZ[]): number {
  let d = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) d = Math.min(d, segDist(x, z, poly[j], poly[i]));
  return d;
}

/**
 * A good place to stand in a room: its centre if that's inside it, else the
 * inside point furthest from every wall (an L-shaped room's centre can be
 * outside it). Searched on a grid — rooms are small and this runs once.
 */
export function standPoint(poly: XZ[]): XZ {
  const xs = poly.map(p => p[0]), zs = poly.map(p => p[1]);
  const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
  // area centroid
  let a = 0, cx = 0, cz = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const f = poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
    a += f; cx += (poly[j][0] + poly[i][0]) * f; cz += (poly[j][1] + poly[i][1]) * f;
  }
  if (Math.abs(a) > 1e-9) {
    cx /= 3 * a; cz /= 3 * a;
    const room = Math.min(x1 - x0, z1 - z0);
    if (inside(cx, cz, poly) && edgeDistance(cx, cz, poly) > room * 0.2) return [cx, cz];
  }
  let best: XZ = [(x0 + x1) / 2, (z0 + z1) / 2], bestD = -1;
  const n = 24;
  for (let i = 1; i < n; i++) for (let j = 1; j < n; j++) {
    const x = x0 + ((x1 - x0) * i) / n, z = z0 + ((z1 - z0) * j) / n;
    if (!inside(x, z, poly)) continue;
    const d = edgeDistance(x, z, poly);
    if (d > bestD) { bestD = d; best = [x, z]; }
  }
  return best;
}

/** Length of outline two rooms share (within `tol`), and its middle. */
function sharedEdge(a: XZ[], b: XZ[], tol: number): { length: number; mid: XZ } | null {
  let length = 0, sx = 0, sz = 0, n = 0;
  for (let i = 0, j = a.length - 1; i < a.length; j = i++) {
    const p = a[j], q = a[i];
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const steps = Math.max(1, Math.ceil(len / 0.1));
    for (let k = 0; k < steps; k++) {
      const t = (k + 0.5) / steps;
      const x = p[0] + (q[0] - p[0]) * t, z = p[1] + (q[1] - p[1]) * t;
      if (edgeDistance(x, z, b) <= tol) { length += len / steps; sx += x; sz += z; n++; }
    }
  }
  return n ? { length, mid: [sx / n, sz / n] } : null;
}

export function buildTour(
  rooms: TourRoomIn[],
  doors: TourDoorIn[],
  opts: { eyeHeight: (x: number, z: number) => number; minArea: number; wallTol: number },
): { nodes: TourNodeOut[]; plan: TourPlanOut } {
  const used = rooms.filter(r => r.poly.length >= 3 && polygonArea(r.poly) >= opts.minArea);
  const nodes: TourNodeOut[] = used.map((r, i) => {
    const [x, z] = standPoint(r.poly);
    return { id: `n${i}`, roomId: r.id, name: r.name || `Room ${i + 1}`, position: [x, opts.eyeHeight(x, z), z], links: [] };
  });

  const link = (a: number, b: number, at: XZ) => {
    if (a === b || nodes[a].links.some(l => l.to === nodes[b].id)) return;
    nodes[a].links.push({ to: nodes[b].id, at });
    nodes[b].links.push({ to: nodes[a].id, at });
  };

  // doors: every room within reach of the doorway is joined to every other
  for (const d of doors) {
    const near = used
      .map((r, i) => ({ i, dist: inside(d.x, d.z, r.poly) ? 0 : edgeDistance(d.x, d.z, r.poly) }))
      .filter(r => r.dist <= d.reach)
      .map(r => r.i);
    for (let p = 0; p < near.length; p++) for (let q = p + 1; q < near.length; q++) link(near[p], near[q], [d.x, d.z]);
  }

  // nobody stranded: a room with no doorway joins its longest neighbour
  nodes.forEach((n, i) => {
    if (n.links.length) return;
    let best: { j: number; length: number; mid: XZ } | null = null;
    used.forEach((r, j) => {
      if (j === i) return;
      const s = sharedEdge(used[i].poly, r.poly, opts.wallTol);
      if (s && s.length > 0.3 && (!best || s.length > best.length)) best = { j, ...s };
    });
    if (best) link(i, (best as { j: number }).j, (best as { mid: XZ }).mid);
  });

  const xs = used.flatMap(r => r.poly.map(p => p[0])), zs = used.flatMap(r => r.poly.map(p => p[1]));
  const r3 = (v: number) => Math.round(v * 1000) / 1000;
  return {
    nodes: nodes.map(n => ({
      ...n,
      position: n.position.map(r3) as [number, number, number],
      links: n.links.map(l => ({ to: l.to, at: [r3(l.at[0]), r3(l.at[1])] as XZ })),
    })),
    plan: {
      rooms: used.map(r => ({ id: r.id, name: r.name, poly: r.poly.map(p => [r3(p[0]), r3(p[1])] as XZ) })),
      bounds: xs.length ? [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)] : [0, 0, 1, 1],
    },
  };
}

/** Viewer maths: compass bearing (radians, 0 = −Z, turning right is +) from a to b. */
export function bearing(from: XZ, to: XZ): number {
  return Math.atan2(to[0] - from[0], -(to[1] - from[1]));
}
