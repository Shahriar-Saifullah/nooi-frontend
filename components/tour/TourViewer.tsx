"use client";

/**
 * 360° tour viewer — one panorama per room, like a Kujiale tour.
 *
 *   drag / arrow keys   look around          wheel / + −   zoom
 *   pins in the room    walk to the next room (towards its doorway)
 *   map, room menu      jump to any room
 *
 * Panoramas come from the photo render worker in panorama mode: 2:1
 * equirectangular, the middle of the image looking towards the scene's −Z,
 * turning right = moving right in the image. The sphere is turned so a
 * direction in the viewer is the same direction in the 3D scene — so a pin
 * placed towards a doorway in scene coordinates lands on that doorway.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { ChevronDown, ChevronUp, Loader2, Maximize2, Minimize2, Minus, Plus, Map as MapIcon } from "lucide-react";
import type { Tour, TourNodeView } from "@/lib/api/tours";
import { bearing } from "@/lib/tour/graph";

const DEG = Math.PI / 180;
const MIN_FOV = 35, MAX_FOV = 100;
/** A doorway pin sits this far above the floor (m), so it reads as "through there". */
const PIN_HEIGHT = 0.9;

function lookDir(lon: number, lat: number) {
  return new THREE.Vector3(Math.sin(lon) * Math.cos(lat), Math.sin(lat), -Math.cos(lon) * Math.cos(lat));
}

export default function TourViewer({ tour, toolbar }: { tour: Tour; toolbar?: React.ReactNode }) {
  const ready = useMemo(() => tour.nodes.filter(n => n.status === "done" && n.url), [tour.nodes]);
  const byId = useMemo(() => new Map(ready.map(n => [n.id, n])), [ready]);
  const [currentId, setCurrentId] = useState<string | null>(ready[0]?.id ?? null);
  const current = (currentId && byId.get(currentId)) || ready[0] || null;

  const hostRef = useRef<HTMLDivElement>(null);
  const canvasHost = useRef<HTMLDivElement>(null);
  const pinRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const view = useRef({ lon: 0, lat: 0, fov: 75 });
  const [lonForMap, setLonForMap] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fading, setFading] = useState(false);
  const [mapOpen, setMapOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [full, setFull] = useState(false);

  const three = useRef<{
    renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera;
    sphere: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>; dirty: boolean;
  } | null>(null);
  const textures = useRef(new Map<string, Promise<THREE.Texture>>());

  const loadTexture = useCallback((url: string) => {
    let p = textures.current.get(url);
    if (!p) {
      p = new Promise<THREE.Texture>((resolve, reject) => {
        new THREE.TextureLoader().load(url, t => {
          t.colorSpace = THREE.SRGBColorSpace;
          t.minFilter = THREE.LinearFilter;
          t.generateMipmaps = false;
          resolve(t);
        }, undefined, reject);
      });
      textures.current.set(url, p);
    }
    return p;
  }, []);

  // the render loop reads these (it is set up once)
  const links = useMemo(
    () => (current ? current.links.filter(l => byId.has(l.to)) : []),
    [current, byId],
  );
  const linksRef = useRef(links);
  const currentRef = useRef(current);

  // ── three.js setup ────────────────────────────────────────────────────────
  useEffect(() => {
    const host = canvasHost.current;
    if (!host) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(view.current.fov, 1, 0.1, 1000);
    const geo = new THREE.SphereGeometry(500, 96, 48);
    geo.scale(-1, 1, 1);          // see it from inside
    const sphere = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x222222 }));
    sphere.rotation.y = -Math.PI / 2;  // image centre → scene −Z
    scene.add(sphere);
    three.current = { renderer, scene, camera, sphere, dirty: true };

    const resize = () => {
      const w = host.clientWidth, h = host.clientHeight;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
      if (three.current) three.current.dirty = true;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const t = three.current;
      if (!t || !t.dirty) return;
      t.dirty = false;
      const { lon, lat, fov } = view.current;
      if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
      camera.lookAt(lookDir(lon, lat));
      renderer.render(scene, camera);
      placePins(t, currentRef.current, linksRef.current, pinRefs.current);
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.dispose();
      geo.dispose();
      sphere.material.dispose();
      host.removeChild(renderer.domElement);
      three.current = null;
    };
  }, []);

  const redraw = () => { if (three.current) three.current.dirty = true; };

  // ── pins towards the doorways ─────────────────────────────────────────────
  useEffect(() => { linksRef.current = links; currentRef.current = current; redraw(); }, [links, current]);

  // ── switching rooms ───────────────────────────────────────────────────────
  useEffect(() => {
    const t = three.current;
    if (!t || !current?.url) return;
    let live = true;
    setLoading(true);
    loadTexture(current.url).then(tex => {
      if (!live || !three.current) return;
      const m = three.current.sphere.material;
      m.map = tex;
      m.color.set(0xffffff);
      m.needsUpdate = true;
      setLoading(false);
      setFading(false);
      redraw();
      // the next rooms load in the background, so walking on is instant
      for (const l of current.links) {
        const n = byId.get(l.to);
        if (n?.url) loadTexture(n.url).catch(() => undefined);
      }
    }).catch(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [current, byId, loadTexture]);

  const go = useCallback((id: string, faceFrom?: [number, number]) => {
    const target = byId.get(id);
    if (!target || target.id === currentRef.current?.id) return;
    if (faceFrom) {
      // keep facing the way you walked
      view.current.lon = bearing(faceFrom, [target.position[0], target.position[2]]);
      setLonForMap(view.current.lon);
    }
    setFading(true);
    setMenuOpen(false);
    window.setTimeout(() => setCurrentId(id), 180);
  }, [byId]);

  // ── looking around ────────────────────────────────────────────────────────
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    let drag: { x: number; y: number; lon: number; lat: number } | null = null;
    const down = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest("[data-ui]")) return;
      drag = { x: e.clientX, y: e.clientY, lon: view.current.lon, lat: view.current.lat };
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      const k = (view.current.fov / 75) * 0.0045;
      view.current.lon = drag.lon - (e.clientX - drag.x) * k;
      view.current.lat = Math.max(-85 * DEG, Math.min(85 * DEG, drag.lat + (e.clientY - drag.y) * k));
      setLonForMap(view.current.lon);
      redraw();
    };
    const up = () => { drag = null; };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      view.current.fov = Math.max(MIN_FOV, Math.min(MAX_FOV, view.current.fov + e.deltaY * 0.05));
      redraw();
    };
    const key = (e: KeyboardEvent) => {
      const step = 5 * DEG;
      if (e.key === "ArrowLeft") view.current.lon -= step;
      else if (e.key === "ArrowRight") view.current.lon += step;
      else if (e.key === "ArrowUp") view.current.lat = Math.min(85 * DEG, view.current.lat + step);
      else if (e.key === "ArrowDown") view.current.lat = Math.max(-85 * DEG, view.current.lat - step);
      else return;
      setLonForMap(view.current.lon);
      redraw();
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("keydown", key);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("wheel", wheel);
      window.removeEventListener("keydown", key);
    };
  }, []);

  const zoom = (d: number) => {
    view.current.fov = Math.max(MIN_FOV, Math.min(MAX_FOV, view.current.fov + d));
    redraw();
  };

  const toggleFull = () => {
    const el = hostRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    else el.requestFullscreen?.().catch(() => undefined);
  };
  useEffect(() => {
    const f = () => { setFull(!!document.fullscreenElement); redraw(); };
    document.addEventListener("fullscreenchange", f);
    return () => document.removeEventListener("fullscreenchange", f);
  }, []);

  if (!current) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#15191a] text-[13px] text-white/70">
        No rooms of this tour are ready yet.
      </div>
    );
  }

  return (
    <div ref={hostRef} className="relative h-full w-full touch-none select-none overflow-hidden bg-black"
      style={{ cursor: "grab" }} tabIndex={0} aria-label="360° tour">
      <div ref={canvasHost} className="absolute inset-0" />
      <div className={`pointer-events-none absolute inset-0 bg-black transition-opacity duration-200 ${fading ? "opacity-100" : "opacity-0"}`} />
      {loading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader2 size={26} className="animate-spin text-white/80" />
        </div>
      )}

      {/* pins to the next rooms */}
      {links.map((l, i) => {
        const to = byId.get(l.to)!;
        return (
          <button key={`${current.id}-${l.to}`} data-ui ref={el => { pinRefs.current[i] = el; }}
            onClick={() => go(l.to, [current.position[0], current.position[2]])}
            className="absolute left-0 top-0 hidden flex-col items-center gap-1.5"
            style={{ transform: "translate(-50%, -50%)" }}>
            <span className="rounded-full bg-black/45 px-3.5 py-1.5 text-[12.5px] font-medium uppercase tracking-wide text-white backdrop-blur-sm">
              {to.name}
            </span>
            <ChevronUp size={30} strokeWidth={2.5} className="text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]" />
          </button>
        );
      })}

      {/* room menu + map */}
      <div data-ui className="absolute left-4 top-4 w-[230px] overflow-hidden rounded-[12px] bg-black/45 text-white backdrop-blur-md">
        <button onClick={() => setMenuOpen(o => !o)} className="flex w-full items-center justify-between px-3.5 py-2.5 text-left">
          <span className="truncate text-[13px] font-semibold uppercase tracking-wide">{current.name}</span>
          <ChevronDown size={15} className={`shrink-0 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
        </button>
        {menuOpen && (
          <div className="max-h-[40vh] overflow-y-auto border-t border-white/10 py-1">
            {ready.map(n => (
              <button key={n.id} onClick={() => go(n.id)}
                className={`block w-full px-3.5 py-1.5 text-left text-[12.5px] hover:bg-white/10 ${n.id === current.id ? "text-[#c7de7d]" : "text-white/85"}`}>
                {n.name}
              </button>
            ))}
          </div>
        )}
        {mapOpen && !menuOpen && <TourMap tour={tour} ready={ready} currentId={current.id} lon={lonForMap} onGo={id => go(id)} />}
      </div>

      {/* controls */}
      <div data-ui className="absolute bottom-4 right-4 flex items-center gap-1.5">
        {toolbar}
        <button onClick={() => setMapOpen(o => !o)} title={mapOpen ? "Hide map" : "Show map"} className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm hover:bg-black/60"><MapIcon size={16} /></button>
        <button onClick={() => zoom(-10)} title="Zoom in" className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm hover:bg-black/60"><Plus size={16} /></button>
        <button onClick={() => zoom(10)} title="Zoom out" className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm hover:bg-black/60"><Minus size={16} /></button>
        <button onClick={toggleFull} title={full ? "Exit full screen" : "Full screen"} className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm hover:bg-black/60">
          {full ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>
    </div>
  );
}

/** Put each doorway pin over its doorway, or hide it when it's behind you. */
function placePins(
  t: { renderer: THREE.WebGLRenderer; camera: THREE.PerspectiveCamera },
  node: TourNodeView | null,
  links: TourNodeView["links"],
  pins: (HTMLButtonElement | null)[],
) {
  if (!node) return;
  const w = t.renderer.domElement.clientWidth, h = t.renderer.domElement.clientHeight;
  links.forEach((l, i) => {
    const el = pins[i];
    if (!el) return;
    const v = new THREE.Vector3(l.at[0] - node.position[0], PIN_HEIGHT - node.position[1], l.at[1] - node.position[2]);
    v.normalize().multiplyScalar(10).project(t.camera);
    const visible = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
    el.style.display = visible ? "flex" : "none";
    if (visible) el.style.transform = `translate(-50%, -50%) translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px)`;
  });
}

/** The floor plan: rooms, a pin per panorama, and where you're looking. */
function TourMap({ tour, ready, currentId, lon, onGo }: {
  tour: Tour; ready: TourNodeView[]; currentId: string; lon: number; onGo: (id: string) => void;
}) {
  const [x0, z0, x1, z1] = tour.plan.bounds;
  const pad = Math.max(x1 - x0, z1 - z0) * 0.06;
  const vb = `${x0 - pad} ${z0 - pad} ${x1 - x0 + pad * 2} ${z1 - z0 + pad * 2}`;
  const unit = Math.max(x1 - x0, z1 - z0) / 60;
  const cur = ready.find(n => n.id === currentId);
  return (
    <div className="border-t border-white/10 p-2.5">
      <svg viewBox={vb} className="h-[170px] w-full">
        {tour.plan.rooms.map(r => (
          <polygon key={r.id} points={r.poly.map(p => p.join(",")).join(" ")}
            fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.85)" strokeWidth={unit * 0.6} strokeLinejoin="round" />
        ))}
        {cur && (() => {
          // view cone: 0 = −Z (up on the map), turning right = clockwise
          const [cx, cz] = [cur.position[0], cur.position[2]];
          const r = unit * 9, half = 30 * DEG;
          const p = (a: number) => `${cx + Math.sin(a) * r},${cz - Math.cos(a) * r}`;
          return <path d={`M${cx},${cz} L${p(lon - half)} A${r},${r} 0 0 1 ${p(lon + half)} Z`} fill="rgba(199,222,125,0.55)" />;
        })()}
        {ready.map(n => (
          <circle key={n.id} cx={n.position[0]} cy={n.position[2]} r={unit * (n.id === currentId ? 2.4 : 1.9)}
            fill={n.id === currentId ? "#c7de7d" : "#fff"} stroke="rgba(0,0,0,0.5)" strokeWidth={unit * 0.4}
            className="cursor-pointer" onClick={() => onGo(n.id)}>
            <title>{n.name}</title>
          </circle>
        ))}
      </svg>
    </div>
  );
}
