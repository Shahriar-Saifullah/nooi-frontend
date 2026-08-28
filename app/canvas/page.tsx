"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Search, Minus, Plus, RotateCcw, Sofa,
  ChevronLeft, Share2, Download,
  SlidersHorizontal, Loader2, RotateCw, Trash2,
  Image as ImageIcon, Box,
  Video, Pause, Play, Square, Circle,
  Link2, Check, X, Camera, Maximize2, ArrowLeftRight, Undo2, Redo2,
} from "lucide-react";
import { startCanvasRecording, stopAndDownload, type RecordingSession } from "@/lib/walkthrough-recorder";
import CanvasPromptBox from "@/components/CanvasPromptBox";
import FloorplanPolygonOverlay from "@/components/FloorplanPolygonOverlay";
import FurnitureLibrary, { DND_MIME } from "@/components/FurnitureLibrary";
import FurnitureInspector from "@/components/FurnitureInspector";
import { catalogById, FURNITURE_CATALOG, type CatalogItem } from "@/lib/furniture/catalog";
import {
  snapToWall, resolveCollision, prefersWall, pointInPoly, fitsInRoom,
  type WorldWall, type Footprint, type Poly,
} from "@/lib/placement/snap";
import {
  WALL_SURFACES, SURFACE_CATEGORY_LABELS, activeSurfaceCategories,
  type SurfaceCategory,
} from "@/lib/surfaces/catalog";
import { DOOR_FINISHES } from "@/lib/surfaces/doors";
import type { ThreeSceneHandle, CameraViewPreset } from "@/components/ThreeSceneV2";
import { useProjectStore } from "@/lib/store";
import { getProject, saveFurniture, toggleShare, aiFurnish, renderScene, saveDimensions, saveRooms } from "@/lib/api/projects";
import { type GridRoom } from "@/components/RoomLayoutGrid";
import type { PlacedFurniture } from "@/components/ThreeSceneV2";

// ─── Lazy-load Three.js (no SSR — Three.js requires browser APIs) ─────────────
const ThreeSceneV2 = dynamic(() => import("@/components/ThreeSceneV2"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#1a1f1e]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={24} className="animate-spin text-[#c7de7d]" />
        <p className="text-[13px] text-white/60 font-medium">Loading 3D scene…</p>
      </div>
    </div>
  ),
});

// ─── Furniture catalogue ──────────────────────────────────────────────────────

const FALLBACK_COLORS = ["#c3f4f0", "#b9eac5", "#87ddd7", "#f7dfad", "#d5dbda", "#ffc9c0"];

function toGridRoom(room: any, index: number): GridRoom & {
  width?: number; length?: number; height?: number;
} {
  return {
    id: room.id, name: room.name,
    color: room.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length],
    box: room.box, polygon: room.polygon,
    gridRow: room.gridRow, gridCol: room.gridCol,
    rowWeight: room.rowWeight, colWeight: room.colWeight,
    // NOOI-21: the real measurements were dropped here, which is why they
    // could not be edited after the plan was analysed. They drive the whole
    // world scale, so they have to survive into the canvas.
    width: room.width, length: room.length, height: room.height,
  };
}

const WALL_PAINTS = [
  "#f2f0ec", "#ffffff", "#e8e4d8", "#d9c8b4", "#c9a227", "#b96a4b",
  "#8a9a5b", "#4f6d5a", "#004643", "#6c7a89", "#3b4a6b", "#2f2f2f",
];

export default function CanvasPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [rightTab, setRightTab] = useState<"elements" | "edit">("elements");
  const [zoom, setZoom] = useState(100);
  const [mounted, setMounted] = useState(false);

  const { currentProject, setProjectRooms, setProject } = useProjectStore();
  const [rooms, setRooms] = useState<Array<GridRoom & {
    width?: number; length?: number; height?: number;
  }>>([]);
  const [buildingPerimeter, setBuildingPerimeter] = useState<[number,number][] | null>(null);
  const [rfWalls, setRfWalls] = useState<Array<{x1:number;y1:number;x2:number;y2:number;thickness:number}>>([]);
  const [openings, setOpenings] = useState<Array<{type:'door'|'window';wall:'horizontal'|'vertical';x:number;y:number;width:number}>>([]);
  const [imageSize, setImageSize] = useState<{width:number;height:number} | null>(null);
  const [fetchedRooms, setFetchedRooms] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [loadingRooms, setLoadingRooms] = useState(false);

  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  // session render history: newest first. `source` is the 3D capture that
  // produced a scene render, enabling the before/after compare.
  const [renders, setRenders] = useState<{ url: string; source?: string; at: number }[]>([]);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [isGeneratingRender, setIsGeneratingRender] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  const [placedFurniture, setPlacedFurniture] = useState<PlacedFurniture[]>([]);
  const sceneRef = useRef<ThreeSceneHandle>(null);
  const [selectedFurnitureId, setSelectedFurnitureId] = useState<string | null>(null);
  const [isDragOverCanvas, setIsDragOverCanvas] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  // ── Toast notifications ──────────────────────────────────────────────────
  const [toast, setToast] = useState<string | null>(null);
  const [toastAction, setToastAction] = useState<{ label: string; onClick: () => void } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Walkthrough state ────────────────────────────────────────────────────
  const [walkthroughActive, setWalkthroughActive] = useState(false);
  const [walkthroughPaused, setWalkthroughPaused] = useState(false);
  const [walkthroughProgress, setWalkthroughProgress] = useState(0);
  const [walkthroughStatusText, setWalkthroughStatusText] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recorderSessionRef = useRef<RecordingSession | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // ── Open a specific project from the dashboard (?projectId=…) ─────────────
  // The store may still hold a different project from an earlier session;
  // the URL param is the source of truth when present.
  useEffect(() => {
    if (!mounted) return;
    const pid = new URLSearchParams(window.location.search).get("projectId");
    if (!pid || pid === currentProject?.id) return;
    // clear any stale scene state from a previously open project
    setRooms([]);
    setFetchedRooms([]);
    setPlacedFurniture([]);
    setRfWalls([]);
    setOpenings([]);
    setWallColors({});
    setWallSurfaces({});
    setDoorFinishes({});
    setSelectedWall(null);
    setSelectedDoor(null);
    // critical: without this, the empty furniture array above would pass the
    // auto-save guard and wipe the incoming project's saved furniture
    furnitureLoaded.current = false;
    // stub with just the id — the main load effect fetches the rest
    setProject({ id: pid } as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    const haveStoreRooms = (currentProject?.rooms?.length ?? 0) > 0;
    if (haveStoreRooms) {
      // Use detected coordinates directly — do NOT relayout
      setRooms(currentProject!.rooms!.map(toGridRoom).filter((r: GridRoom) => r.box || r.polygon));
    }
    if (currentProject?.id) {
      // ALWAYS fetch room_data: walls, openings, and image_size live only in
      // the project record — without them the 3D view has floors but no walls.
      // (Previously this fetch was skipped whenever the store already had
      // rooms, i.e. exactly when arriving fresh from project creation.)
      if (!haveStoreRooms) setLoadingRooms(true);
      getProject(currentProject.id)
        .then(p => {
          const apiRooms = p.room_data?.rooms ?? [];
          if (apiRooms.length > 0) setFetchedRooms(apiRooms);
          const savedFurniture = (p.room_data as any)?.furniture;
          if (Array.isArray(savedFurniture) && savedFurniture.length > 0) {
            setPlacedFurniture(savedFurniture);
            furnitureLoaded.current = true;
          }
          const savedWallColors = (p.room_data as any)?.wall_colors;
          if (savedWallColors && typeof savedWallColors === "object") {
            setWallColors(savedWallColors);
          }
          const savedWallSurfaces = (p.room_data as any)?.wall_surfaces;
          if (savedWallSurfaces && typeof savedWallSurfaces === "object") {
            setWallSurfaces(savedWallSurfaces);
          }
          const savedDoorFinishes = (p.room_data as any)?.door_finishes;
          if (savedDoorFinishes && typeof savedDoorFinishes === "object") {
            setDoorFinishes(savedDoorFinishes);
          }
          if (!haveStoreRooms && apiRooms.length > 0) {
            // server rooms only when the store has none — the user's freshly
            // edited names in the store always win
            setRooms(apiRooms.map(toGridRoom).filter((r: GridRoom) => r.box || r.polygon));
            setProjectRooms(apiRooms);
          }
          if (p.room_data?.building_perimeter) {
            setBuildingPerimeter(p.room_data.building_perimeter);
          }
          if (p.room_data?.walls) {
            setRfWalls(p.room_data.walls);
          }
          if (p.room_data?.openings) {
            setOpenings(p.room_data.openings);
          }
          if ((p.room_data as any)?.image_size) {
            setImageSize((p.room_data as any).image_size);
          }
          if ((p.name && p.name !== currentProject?.name) || (p.floor_plan_url && !floorPlanUrl)) {
            // hydrate store fields the stub / stale entry may lack (navbar
            // title, export filenames, walkthrough recordings all use name)
            setProject({
              ...(currentProject as any),
              id: p.id,
              name: p.name ?? currentProject?.name,
              floor_plan_url: p.floor_plan_url ?? (currentProject as any)?.floor_plan_url,
            });
          }
          // sharing state lives on the project row
          setShareEnabled(!!p.share_enabled);
          setShareToken(p.share_token ?? null);
        })
        .catch(err => console.error("Failed to load project geometry:", err))
        .finally(() => setLoadingRooms(false));
    }
  }, [mounted, currentProject?.id]);

  // Resolve floor plan URL from either field name (store uses both)
  const floorPlanUrl = currentProject?.floor_plan_url || currentProject?.floorPlanUrl || null;


  // ── Snap to surface ────────────────────────────────────────────────────────
  // Small items (a vase, a book) should rest ON tables and consoles, not sink
  // to the floor beside them. Returns the height in METRES that an item at
  // (x, z) should sit at: 0 for the floor, otherwise the top of whatever it
  // is standing on.
  const supportHeightAt = (
    x: number, z: number,
    item: { width?: number; depth?: number; mountType?: "floor" | "ceiling" | "wall"; modelId?: string },
    excludeId?: string,
  ): number => {
    // ceiling / wall mounts get their height from mountType in the scene —
    // never give them a support height or they end up above the roof
    const cat = item.modelId ? catalogById(item.modelId) : undefined;
    const mountType = item.mountType ?? cat?.mountType ?? "floor";
    if (mountType !== "floor") return 0;
    const iw = item.width ?? 0, id = item.depth ?? 0;
    if (!iw || !id) return 0;
    const itemArea = iw * id;

    // rotation-aware half extents in metres
    const half = (w: number, d: number, rot: number): [number, number] => {
      const swapped = Math.abs(Math.sin(rot)) > 0.7;
      return [(swapped ? d : w) / 200, (swapped ? w : d) / 200];
    };

    let top = 0;
    for (const o of placedFurniture) {
      if (o.id === excludeId) continue;
      const oCat = o.modelId ? catalogById(o.modelId) : undefined;
      const oMountType = o.mountType ?? oCat?.mountType ?? "floor";
      // a pendant light is not a shelf
      if (oMountType !== "floor") continue;
      const ow = o.width ?? 0, od = o.depth ?? 0, oh = o.height ?? 0;
      if (!ow || !od || !oh) continue;
      // only rest on something meaningfully larger — stops a sofa perching
      // on a nightstand, and stops two vases stacking on each other
      if (itemArea > ow * od * 0.6) continue;
      const [ohw, ohd] = half(ow, od, o.rotation ?? 0);
      // the item's centre must be over the supporting footprint
      if (Math.abs(x - o.position[0]) > ohw) continue;
      if (Math.abs(z - o.position[2]) > ohd) continue;
      const oTop = (o.position[1] ?? 0) + oh / 100;
      // ignore anything above worktop-ish height — nothing should land on a
      // wardrobe roof by accident
      if (oTop > top && oTop <= 1.6) top = oTop;
    }
    return top;
  };

  const addFurniture = (cat: CatalogItem, position: [number, number, number]) => {
    const newItem: PlacedFurniture = {
      id: `${cat.id}-${Date.now()}`,
      modelId: cat.id,
      name: cat.name,
      position,
      rotation: 0,
      sizeScale: 1,
      color: null,
      materialPreset: null,
      // legacy fields keep older consumers happy + power the box fallback
      scale: [1, 1, 1],
      width: cat.size.w,
      depth: cat.size.d,
      height: cat.size.h,
      mountType: (cat as any).mountType,
    };
    setPlacedFurniture(prev => [...prev, newItem]);
    setSelectedFurnitureId(newItem.id);
    setRightTab("edit");
  };

  const handleDrop3D = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverCanvas(false);
    if (viewMode !== "3d") return;
    const modelId = e.dataTransfer.getData(DND_MIME) ||
                    e.dataTransfer.getData("text/plain");
    const cat = modelId ? catalogById(modelId) : undefined;
    if (!cat) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const isCeiling = (cat as any).mountType === "ceiling";

    if (isCeiling && cameraView !== "inside") {
      setToast("Chandeliers attach to the ceiling. Switch to Inside mode to see the roof!");
      setToastAction({
        label: "Switch to Inside →",
        onClick: () => {
          handleCameraView("inside");
          setToast(null);
          setToastAction(null);
        },
      });
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => {
        setToast(null);
        setToastAction(null);
      }, 7000);
    }

    // client coords → NDC → raycast onto floor or ceiling plane
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    const hit = sceneRef.current?.floorPointFromNdc(nx, ny, isCeiling ? "ceiling" : "floor");
    const x = hit ? hit[0] : 0, z = hit ? hit[1] : 0;
    const y = supportHeightAt(x, z, {
      width: cat.size.w, depth: cat.size.d, mountType: (cat as any).mountType,
    });
    const pos: [number, number, number] = [x, y, z];
    addFurniture(cat, pos);
  };

  // ── Wall painting: per-side colors, keyed "wallKey:A" | "wallKey:B" ────────
  const [wallColors, setWallColors] = useState<Record<string, string>>({});
  const [selectedWall, setSelectedWall] = useState<{ key: string; side: "A" | "B" } | null>(null);
  const [wallSurfaces, setWallSurfaces] = useState<Record<string, string>>({});
  const [doorFinishes, setDoorFinishes] = useState<Record<string, string>>({});
  const [selectedDoor, setSelectedDoor] = useState<string | null>(null);
  // door keys as reported by the 3D scene — authoritative
  const [doorKeys, setDoorKeys] = useState<string[]>([]);
  const [wallTab, setWallTab] = useState<"paint" | "surface">("paint");
  const [surfaceCat, setSurfaceCat] = useState<SurfaceCategory | "all">("all");
  const wallKeyOf = (w: { key: string; side: "A" | "B" }) => `${w.key}:${w.side}`;

  // ── persist furniture: debounced auto-save 1.5s after the last change ──
  const furnitureLoaded = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!currentProject?.id) return;
    // skip the very first render (empty state) and the load itself;
    // wall paint alone (before any furniture) must still save
    if (!furnitureLoaded.current && placedFurniture.length === 0
        && Object.keys(wallColors).length === 0
        && Object.keys(wallSurfaces).length === 0
        && Object.keys(doorFinishes).length === 0) return;
    furnitureLoaded.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveFurniture(currentProject.id, placedFurniture as any, wallColors, wallSurfaces, doorFinishes)
        .catch(err => console.error("Scene save failed:", err));
    }, 1500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [placedFurniture, wallColors, wallSurfaces, doorFinishes, currentProject?.id]);

  // Wall snapping can re-orient an item so its back faces the wall.
  const handleFurnitureRotate = (id: string, rotation: number) => {
    setPlacedFurniture(prev => prev.map(f => f.id === id ? { ...f, rotation } : f));
  };

  const handleFurnitureMove = (id: string, position: [number, number, number]) => {
    setPlacedFurniture(prev => prev.map(f => {
      if (f.id !== id) return f;
      // Ceiling / wall mounts keep whatever the scene gave us — their height
      // comes from mountType, not from a supporting surface.
      const mt = f.mountType ?? "floor";
      if (mt !== "floor") return { ...f, position };
      // floor items re-evaluate support as they move: drag a vase onto a
      // table and it climbs; drag it off and it drops back to the floor
      const y = supportHeightAt(position[0], position[2], f, id);
      return { ...f, position: [position[0], y, position[2]] as [number, number, number] };
    }));
  };

  const patchSelected = (patch: Partial<PlacedFurniture>) => {
    if (!selectedFurnitureId) return;
    setPlacedFurniture(prev =>
      prev.map(f => f.id === selectedFurnitureId ? { ...f, ...patch } : f));
  };

  // keyboard: Delete removes, R rotates the selected item
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selectedFurnitureId) return;
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        setPlacedFurniture(prev => prev.filter(f => f.id !== selectedFurnitureId));
        setSelectedFurnitureId(null);
      } else if (e.key.toLowerCase() === "r") {
        setPlacedFurniture(prev => prev.map(f =>
          f.id === selectedFurnitureId
            ? { ...f, rotation: (f.rotation ?? 0) + Math.PI / 4 } : f));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedFurnitureId]);

  const handleRotate = () => {
    if (!selectedFurnitureId) return;
    setPlacedFurniture(prev => prev.map(f => f.id === selectedFurnitureId ? { ...f, rotation: f.rotation + Math.PI / 4 } : f));
  };

  const handleDelete = () => {
    setPlacedFurniture(prev => prev.filter(f => f.id !== selectedFurnitureId));
    setSelectedFurnitureId(null);
  };

  // ── Walkthrough handlers ─────────────────────────────────────────────────
  const startWalkthrough = () => {
    setWalkthroughActive(true);
    setWalkthroughPaused(false);
    setWalkthroughProgress(0);
    setWalkthroughStatusText("Starting 360° Walkthrough…");
  };

  const stopWalkthrough = async () => {
    // Flush any active recording before ending the tour
    if (isRecording && recorderSessionRef.current) {
      setIsRecording(false);
      await stopAndDownload(
        recorderSessionRef.current,
        `${currentProject?.name ?? "nooi"}-tour.webm`,
      );
      recorderSessionRef.current = null;
    }
    setWalkthroughActive(false);
    setWalkthroughPaused(false);
    setWalkthroughProgress(0);
    setWalkthroughStatusText(null);
  };

  const togglePause = () => setWalkthroughPaused((p) => !p);

  const toggleRecording = async () => {
    // Stop + download if recording is already active
    if (isRecording && recorderSessionRef.current) {
      setIsRecording(false);
      await stopAndDownload(
        recorderSessionRef.current,
        `${currentProject?.name ?? "nooi"}-tour.webm`,
      );
      recorderSessionRef.current = null;
      return;
    }
    // Start recording — grab the underlying WebGL canvas from the scene ref
    const canvas = sceneRef.current?.getCanvasElement?.();
    if (!canvas) return;
    recorderSessionRef.current = startCanvasRecording(canvas);
    setIsRecording(true);
  };

  const selectedFurniture = placedFurniture.find(f => f.id === selectedFurnitureId);

  // Compute overall floor plan dimensions in cm from room data.
  // The total_area gives us the scale — use the largest room dimensions
  // to size the 3D scene correctly.
  // Use the actual image dimensions from Roboflow to compute the 3D scene aspect ratio.
  // This ensures walls are proportionally correct relative to the real floor plan.
  const roomDimensionsCm = (() => {
    // REAL-WORLD SCALE: derive the plan's true width from the room
    // measurements the user entered in the dimensions step. Each room with a
    // real width/length and a box gives an estimate of the full plan width
    // (room_metres / box_fraction); the median across rooms is robust to a
    // single bad entry. This "stretches" the 3D world to true proportions —
    // rooms at real size against the fixed 2.8m wall height.
    const est: number[] = [];
    const dimSources = [
      ...(currentProject?.rooms ?? []),
      ...fetchedRooms,
    ];
    for (const r of dimSources) {
      const b = (r as any).box;
      if (!b) continue;
      const wM = Number((r as any).width);
      const lM = Number((r as any).length);
      if (Number.isFinite(wM) && wM > 1 && b.width > 3) {
        est.push((wM * 100) / (b.width / 100));
      }
      if (Number.isFinite(lM) && lM > 1 && b.height > 3) {
        // length maps to plan depth; convert via image aspect to plan width
        const aspect = imageSize && imageSize.height > 0
          ? imageSize.width / imageSize.height : 1.25;
        est.push(((lM * 100) / (b.height / 100)) * aspect);
      }
    }
    const sane = est.filter(v => v > 800 && v < 6000).sort((a, b) => a - b);
    const BASE = sane.length >= 2
      ? sane[Math.floor(sane.length / 2)]   // median plan width in cm
      : 2600;                                // fallback (was 1500)
    // VISUAL_SCALE: presentation-only footprint stretch. Rooms grow 1.5x
    // relative to the fixed 2.8m wall height, which reads airier in the
    // dollhouse view. Proportions between rooms stay exact; displayed
    // measurements are untouched (they come from the data, not the scene).
    const VISUAL_SCALE = 1.5;
    const SCALED = BASE * VISUAL_SCALE;
    if (typeof window !== "undefined") {
      console.info(`[nooi3d] world width: ${(BASE / 100).toFixed(1)}m x` +
        `${VISUAL_SCALE} = ${(SCALED / 100).toFixed(1)}m ` +
        `(${sane.length >= 2 ? "from " + sane.length + " measurements" : "fallback"})`);
    }
    if (imageSize && imageSize.width > 0 && imageSize.height > 0) {
      if (imageSize.width >= imageSize.height) {
        return { width: Math.round(SCALED), depth: Math.round(SCALED * imageSize.height / imageSize.width) };
      } else {
        return { width: Math.round(SCALED * imageSize.width / imageSize.height), depth: Math.round(SCALED) };
      }
    }
    // Fallback: use Roboflow wall extents to estimate aspect ratio
    if (rfWalls.length > 0) {
      const maxX = Math.max(...rfWalls.map(w => Math.max(w.x1, w.x2)));
      const maxY = Math.max(...rfWalls.map(w => Math.max(w.y1, w.y2)));
      if (maxX > 0 && maxY > 0) {
        const BASE = 1500;
        return maxX >= maxY
          ? { width: BASE, depth: Math.round(BASE * maxY / maxX) }
          : { width: Math.round(BASE * maxX / maxY), depth: BASE };
      }
    }
    // Fallback: use room data
    if (rooms.length > 0) {
      const largestWidth  = Math.max(...rooms.map((r: any) => (r.width  || 0) * 100));
      const largestLength = Math.max(...rooms.map((r: any) => (r.length || 0) * 100));
      if (largestWidth > 0 && largestLength > 0) {
        return { width: Math.max(largestWidth * 2, 400), depth: Math.max(largestLength * 2, 400) };
      }
    }
    return { width: 1500, depth: 1200 };
  })();

  // ── Camera view presets ────────────────────────────────────────────────────
  const [cameraView, setCameraView] = useState<CameraViewPreset>("default");
  const handleCameraView = (view: CameraViewPreset) => {
    setCameraView(view);
    sceneRef.current?.setCameraView(view);
  };

  // ── AI furnish: "decorate my master bedroom" → placed furniture ────────────
  const [isFurnishing, setIsFurnishing] = useState(false);
  const [assistantMsg, setAssistantMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const FURNISH_VERB = /(furnish|decorat|add|place|put|fill|arrange|set\s*up|style)/i;
  const FURNISH_NOUN = /(furnitur|sofa|couch|bed\b|beds\b|table|chair|desk|wardrobe|dresser|rug|lamp|shelf|room|bedroom|living|dining|kitchen|bath|balcon)/i;

  // world-space geometry for each room. IMPORTANT: polygon first — that's what
  // ThreeSceneV2 actually renders as the room floor; `box` is a legacy grid
  // rectangle that can sit elsewhere entirely. Coords: plan units are 0–100,
  // world is meters centered on the origin (same mapping as ThreeSceneV2.px/pz).
  const roomWorldRects = () => {
    const totalW = roomDimensionsCm.width / 100;
    const totalD = roomDimensionsCm.depth / 100;
    const toWorld = ([px, py]: [number, number]): [number, number] => [
      (px / 100) * totalW - totalW / 2,
      (py / 100) * totalD - totalD / 2,
    ];
    return rooms.map(r => {
      let polygon: [number, number][] | undefined;
      let corners: [number, number][] | null = null;
      if (r.polygon && r.polygon.length >= 3) {
        polygon = r.polygon.map(toWorld);
        corners = polygon;
      } else if (r.box) {
        const b = r.box;
        corners = [
          toWorld([b.left, b.top]),
          toWorld([b.left + b.width, b.top + b.height]),
        ];
      }
      if (!corners) return null;
      const xs = corners.map(c => c[0]), zs = corners.map(c => c[1]);
      const minX = Math.min(...xs), minZ = Math.min(...zs);
      return {
        id: r.id,
        name: r.name,
        rect: { x: minX, z: minZ, w: Math.max(...xs) - minX, d: Math.max(...zs) - minZ },
        polygon,   // world coords — backend rejects placements outside it
      };
    }).filter((r): r is NonNullable<typeof r> => r !== null);
  };

  const handleFurnish = async (command: string): Promise<boolean> => {
    if (!currentProject?.id) return false;
    const roomPayload = roomWorldRects();
    if (roomPayload.length === 0) {
      setAssistantMsg({ kind: "err", text: "I can't see any rooms yet — wait for the floor plan to load." });
      return true;
    }
    setIsFurnishing(true);
    setAssistantMsg(null);
    try {
      const data = await aiFurnish(currentProject.id, {
        command,
        rooms: roomPayload,
        catalog: FURNITURE_CATALOG.map(c => ({
          id: c.id, name: c.name, category: c.category, w: c.size.w, d: c.size.d, h: c.size.h,
        })),
        existing: placedFurniture.map(f => ({
          name: f.name, x: f.position[0], z: f.position[2],
        })),
      });
      const stamp = Date.now();
      const newItems: PlacedFurniture[] = [];

      // NOOI-16: the model reasons about a room as a rectangle and tends to
      // leave beds and wardrobes floating near the middle. Pull anything that
      // belongs against a wall onto the nearest one, then settle overlaps —
      // furniture marooned mid-room is the clearest sign a machine placed it.
      const walls = worldWalls();
      const targetRoom = roomPayload.find(r => r.id === data.targetRoomId);
      const roomPoly: Poly | null = targetRoom?.polygon ?? (targetRoom ? [
        [targetRoom.rect.x, targetRoom.rect.z],
        [targetRoom.rect.x + targetRoom.rect.w, targetRoom.rect.z],
        [targetRoom.rect.x + targetRoom.rect.w, targetRoom.rect.z + targetRoom.rect.d],
        [targetRoom.rect.x, targetRoom.rect.z + targetRoom.rect.d],
      ] as Poly : null);

      const settled: Footprint[] = placedFurniture
        .filter(f => (f.mountType ?? "floor") === "floor")
        .map(f => ({
          x: f.position[0], z: f.position[2],
          w: (f.width ?? 0) / 100, d: (f.depth ?? 0) / 100,
          rotation: f.rotation ?? 0, id: f.id,
        }))
        .filter(f => f.w > 0 && f.d > 0);

      data.placements.forEach((p, i) => {
        const cat = catalogById(p.modelId);
        if (!cat) return;

        const id = `${cat.id}-${stamp}-${i}`;
        let fp: Footprint = {
          x: p.x, z: p.z,
          w: cat.size.w / 100, d: cat.size.d / 100,
          rotation: (p.rotation * Math.PI) / 180,
          id,
        };

        if (walls.length > 0 && prefersWall(cat.name, cat.typeId)) {
          // Generous threshold: the AI puts these roughly right, just not
          // touching. Free-standing pieces (coffee table, rug) are untouched.
          const snap = snapToWall(fp, walls, 1.2);
          if (snap.snapped) {
            const moved = { ...fp, x: snap.x, z: snap.z, rotation: snap.rotation };
            // Snapping targets the nearest wall, which near a corner or a thin
            // partition can be the far side. Only accept the snap if the whole
            // footprint still sits inside the room the AI chose.
            const room = roomPoly;
            if (!room || fitsInRoom(moved, room)) fp = moved;
          }
        }

        // keep clear of what is already down, including earlier items in
        // this same batch
        fp = resolveCollision(fp, settled);
        settled.push(fp);

        newItems.push({
          id,
          modelId: cat.id,
          name: cat.name,
          // AI returns floor coordinates; lift small items onto any surface
          // they land on, same as a manual drop
          position: [fp.x, supportHeightAt(fp.x, fp.z, {
            width: cat.size.w, depth: cat.size.d, mountType: (cat as any).mountType,
          }), fp.z],
          rotation: fp.rotation,
          sizeScale: 1,
          color: null,
          materialPreset: null,
          scale: [1, 1, 1],
          width: cat.size.w,
          depth: cat.size.d,
          height: cat.size.h,
          mountType: (cat as any).mountType,
        });
      });
      if (newItems.length === 0) throw new Error("No furniture could be placed — try rephrasing.");
      setPlacedFurniture(prev => [...prev, ...newItems]);
      if (viewMode !== "3d") setViewMode("3d");
      setAssistantMsg({
        kind: "ok",
        text: `${data.message} (${newItems.length} item${newItems.length !== 1 ? "s" : ""} in ${data.targetRoomName} — drag any of them to adjust.)`,
      });
    } catch (err: any) {
      setAssistantMsg({ kind: "err", text: err?.message || "Couldn't place furniture — please try again." });
    } finally {
      setIsFurnishing(false);
    }
    return true;
  };

  // ── Render Engine: live 3D scene → Replicate → photorealistic image ────────
  // Downscale + JPEG-compress the WebGL capture before shipping — a raw PNG of
  // a large canvas can exceed the request size limit as base64.
  const downscaleDataUrl = (dataUrl: string, maxW: number): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        const ctx = c.getContext("2d");
        if (!ctx) { reject(new Error("no 2d context")); return; }
        ctx.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => reject(new Error("capture decode failed"));
      img.src = dataUrl;
    });

  // The scene emits depth already oriented for ControlNet (near = white), so
  // this only downscales. It also sanity-checks contrast: a flat map means the
  // capture failed, and sending it would silently degrade the render to plain
  // text-to-image. Better to fall back to the colour pipeline than pretend.
  const prepareDepth = (dataUrl: string, maxW: number): Promise<string | null> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        const ctx = c.getContext("2d");
        if (!ctx) { reject(new Error("no 2d context")); return; }
        ctx.drawImage(img, 0, 0, c.width, c.height);

        // contrast check on a sparse sample
        const px = ctx.getImageData(0, 0, c.width, c.height).data;
        let min = 255, max = 0;
        for (let i = 0; i < px.length; i += 4 * 97) {
          const v = px[i];
          if (v < min) min = v;
          if (v > max) max = v;
        }
        if (max - min < 25) {
          console.warn("[render] depth map has no contrast — using colour pipeline");
          resolve(null);
          return;
        }
        resolve(c.toDataURL("image/jpeg", 0.92));
      };
      img.onerror = () => reject(new Error("depth decode failed"));
      img.src = dataUrl;
    });

  const handleSceneRender = async (command: string): Promise<boolean> => {
    if (!currentProject?.id) return false;
    if (isGeneratingRender) return true;
    // WYSIWYG: render exactly what the user has framed in the 3D view.
    // No live scene (2D mode) → return false → legacy text-only render runs.
    const shot = viewMode === "3d" ? sceneRef.current?.captureImage() : null;
    if (!shot) return false;
    // Depth is captured too; the backend chooses which pipeline to use
    // (RENDER_MODE env var), so switching back is a config change, not a deploy.
    const depthShot = viewMode === "3d" ? sceneRef.current?.captureDepthMap() : null;
    setIsGeneratingRender(true);
    setRenderError(null);
    setAssistantMsg(null);
    try {
      const sceneJpeg = await downscaleDataUrl(shot, 1280);
      let depthJpeg: string | undefined;
      if (depthShot) {
        try { depthJpeg = (await prepareDepth(depthShot, 1280)) ?? undefined; }
        catch { /* depth is optional — colour pipeline still works */ }
      }
      const data = await renderScene(currentProject.id, command, sceneJpeg, depthJpeg);
      setGeneratedImageUrl(data.image_url);
      setRenders(prev => [{ url: data.image_url, source: sceneJpeg, at: Date.now() }, ...prev]);
      setCompareMode(false);
      setViewerUrl(data.image_url);   // big reveal
    } catch (err: any) {
      setRenderError(err?.message || "Render failed — please try again.");
    } finally {
      setIsGeneratingRender(false);
    }
    return true;
  };

  // Walls in world space, same conversion the 3D scene uses.
  const worldWalls = (): WorldWall[] => {
    const totalW = roomDimensionsCm.width / 100;
    const totalD = roomDimensionsCm.depth / 100;
    const maxDim = Math.max(totalW, totalD);
    return rfWalls.map((w, i) => ({
      x1: (w.x1 / 100) * totalW - totalW / 2,
      z1: (w.y1 / 100) * totalD - totalD / 2,
      x2: (w.x2 / 100) * totalW - totalW / 2,
      z2: (w.y2 / 100) * totalD - totalD / 2,
      thickness: (w.thickness / 100) * maxDim,
      id: `wi${i}`,
    }));
  };

  // ── NOOI-11: add rooms by drawing a shape ─────────────────────────────────
  // Plans often miss a room the CV pipeline could not close, or the user wants
  // to sketch one that does not exist yet. Drawn rooms are ordinary polygons in
  // the same 0–100 plan space as detected ones, so everything downstream — 3D
  // floors, wall snapping, containment, AI furnishing — treats them identically.
  const [drawShape, setDrawShape] = useState<"rect" | "circle" | null>(null);
  const [savingRoom, setSavingRoom] = useState(false);

  const handleDrawComplete = async (polygon: [number, number][]) => {
    setDrawShape(null);
    const xs = polygon.map(p => p[0]), ys = polygon.map(p => p[1]);
    const left = Math.min(...xs), top = Math.min(...ys);
    const boxW = Math.max(...xs) - left, boxH = Math.max(...ys) - top;

    // seed real-world size from the current plan scale so the room is roughly
    // right immediately; the user can correct it in the measurements panel
    const planW = roomDimensionsCm.width / 100, planD = roomDimensionsCm.depth / 100;

    const room = {
      id: `room-${Date.now()}`,
      name: "New Room",
      color: FALLBACK_COLORS[rooms.length % FALLBACK_COLORS.length],
      polygon,
      box: { left, top, width: boxW, height: boxH },
      width: Math.round((boxW / 100) * planW * 10) / 10,
      length: Math.round((boxH / 100) * planD * 10) / 10,
    };

    const next = [...rooms, room];
    setRooms(next as any);
    setSelectedRoomId(room.id);

    if (currentProject?.id) {
      setSavingRoom(true);
      try { await saveRooms(currentProject.id, next as any); }
      catch (err) { console.error("Failed to save room:", err); }
      finally { setSavingRoom(false); }
    }
  };

  // ── NOOI-21: edit AI-detected measurements ─────────────────────────────────
  // The floorplan service estimates room sizes from OCR'd dimension text, and
  // it gets them wrong often enough that they must be correctable. Editing one
  // rescales the whole world, so the change is persisted and the layout
  // re-validation pass (NOOI-19) settles the furniture afterwards.
  const [dimDraft, setDimDraft] = useState<{ w: string; l: string } | null>(null);
  const [savingDims, setSavingDims] = useState(false);

  const selectedRoom = rooms.find(r => r.id === selectedRoomId) ?? null;

  useEffect(() => {
    if (!selectedRoom) { setDimDraft(null); return; }
    setDimDraft({
      w: selectedRoom.width != null ? String(selectedRoom.width) : "",
      l: selectedRoom.length != null ? String(selectedRoom.length) : "",
    });
  }, [selectedRoomId]);   // eslint-disable-line react-hooks/exhaustive-deps

  const saveRoomDimensions = async () => {
    if (!selectedRoom || !dimDraft || !currentProject?.id) return;
    const w = parseFloat(dimDraft.w), l = parseFloat(dimDraft.l);
    if (!Number.isFinite(w) || !Number.isFinite(l) || w <= 0 || l <= 0) return;

    const next = rooms.map(r =>
      r.id === selectedRoom.id ? { ...r, width: w, length: l } : r);
    setRooms(next);
    setSavingDims(true);
    try {
      await saveDimensions(currentProject.id, next as any);
    } catch (err) {
      console.error("Failed to save dimensions:", err);
    } finally {
      setSavingDims(false);
    }
  };

  // ── NOOI-22: undo / redo ───────────────────────────────────────────────────
  // Snapshots of the editable scene. Snapshots rather than inverse operations
  // because several systems now move furniture on their own — wall snapping,
  // collision resolution, layout re-validation — and reconstructing an inverse
  // for each of those is far more fragile than remembering the previous state.
  //
  // Changes are coalesced on a short timer so one drag becomes one undo step
  // instead of a hundred.
  type SceneSnapshot = {
    furniture: PlacedFurniture[];
    wallColors: Record<string, string>;
    wallSurfaces: Record<string, string>;
    doorFinishes: Record<string, string>;
  };

  const undoStack = useRef<SceneSnapshot[]>([]);
  const redoStack = useRef<SceneSnapshot[]>([]);
  const lastSnapshot = useRef<SceneSnapshot | null>(null);
  const applyingHistory = useRef(false);
  const historyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [historyTick, setHistoryTick] = useState(0);   // re-render for button state
  const HISTORY_LIMIT = 50;

  const currentSnapshot = (): SceneSnapshot => ({
    furniture: placedFurniture,
    wallColors, wallSurfaces, doorFinishes,
  });

  const applySnapshot = (s: SceneSnapshot) => {
    applyingHistory.current = true;
    setPlacedFurniture(s.furniture);
    setWallColors(s.wallColors);
    setWallSurfaces(s.wallSurfaces);
    setDoorFinishes(s.doorFinishes);
    setSelectedFurnitureId(null);
    setSelectedWall(null);
    setSelectedDoor(null);
  };

  useEffect(() => {
    if (applyingHistory.current) {
      applyingHistory.current = false;
      lastSnapshot.current = currentSnapshot();
      return;
    }
    if (!lastSnapshot.current) {          // first render: baseline only
      lastSnapshot.current = currentSnapshot();
      return;
    }
    if (historyTimer.current) clearTimeout(historyTimer.current);
    historyTimer.current = setTimeout(() => {
      const prev = lastSnapshot.current;
      if (!prev) return;
      undoStack.current.push(prev);
      if (undoStack.current.length > HISTORY_LIMIT) undoStack.current.shift();
      redoStack.current = [];             // a new action invalidates the redo path
      lastSnapshot.current = currentSnapshot();
      setHistoryTick(t => t + 1);
    }, 700);
    return () => { if (historyTimer.current) clearTimeout(historyTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placedFurniture, wallColors, wallSurfaces, doorFinishes]);

  const undo = () => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    if (historyTimer.current) clearTimeout(historyTimer.current);
    redoStack.current.push(currentSnapshot());
    applySnapshot(prev);
    setHistoryTick(t => t + 1);
  };

  const redo = () => {
    const next = redoStack.current.pop();
    if (!next) return;
    if (historyTimer.current) clearTimeout(historyTimer.current);
    undoStack.current.push(currentSnapshot());
    applySnapshot(next);
    setHistoryTick(t => t + 1);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t?.isContentEditable) return;
      if (!(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      // Ctrl+Y is the conventional redo on Windows; ⇧⌘Z on macOS. Support both
      // everywhere rather than sniffing the platform — the wrong guess is worse
      // than accepting an extra shortcut.
      if (k === "y") { e.preventDefault(); redo(); return; }
      if (k !== "z") return;
      e.preventDefault();
      if (e.shiftKey) redo(); else undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placedFurniture, wallColors, wallSurfaces, doorFinishes]);

  // Tooltips should name the shortcut the user actually presses.
  const isMac = typeof navigator !== "undefined"
    && /Mac|iPhone|iPad/i.test(navigator.userAgent);
  const undoHint = isMac ? "⌘Z" : "Ctrl+Z";
  const redoHint = isMac ? "⇧⌘Z" : "Ctrl+Y";

  const canUndo = undoStack.current.length > 0;
  const canRedo = redoStack.current.length > 0;
  void historyTick;   // stacks live in refs; this state forces the re-render

  // ── NOOI-19: re-validate placements after a layout change ─────────────────
  // Editing walls, resizing rooms or re-analysing a plan can leave furniture
  // stranded inside a wall, outside the building, or overlapping. Rather than
  // silently leaving a broken scene, everything is re-settled with the same
  // rules used during manual placement, and the user is told what moved.
  const layoutSig = useRef<string>("");
  const [revalidateNote, setRevalidateNote] = useState<string | null>(null);

  const revalidatePlacements = () => {
    const walls = worldWalls();
    const polys: Poly[] = roomWorldRects()
      .map(r => r.polygon ?? [
        [r.rect.x, r.rect.z],
        [r.rect.x + r.rect.w, r.rect.z],
        [r.rect.x + r.rect.w, r.rect.z + r.rect.d],
        [r.rect.x, r.rect.z + r.rect.d],
      ] as Poly);
    if (polys.length === 0) return;

    let moved = 0;
    setPlacedFurniture(prev => {
      const settled: Footprint[] = [];
      const next = prev.map(f => {
        // ceiling and wall mounts get their position from mountType
        if ((f.mountType ?? "floor") !== "floor") return f;
        const w = (f.width ?? 0) / 100, d = (f.depth ?? 0) / 100;
        if (!w || !d) return f;

        let fp: Footprint = {
          x: f.position[0], z: f.position[2],
          w, d, rotation: f.rotation ?? 0, id: f.id,
        };

        // still inside a room?
        const inside = polys.some(p => pointInPoly(fp.x, fp.z, p));
        if (!inside) {
          // nearest room centroid is a predictable, explainable destination —
          // better than guessing at an edge the user cannot see
          let best: Poly | null = null, bestD = Infinity;
          for (const p of polys) {
            const cx = p.reduce((s, q) => s + q[0], 0) / p.length;
            const cz = p.reduce((s, q) => s + q[1], 0) / p.length;
            const dist = (fp.x - cx) ** 2 + (fp.z - cz) ** 2;
            if (dist < bestD) { bestD = dist; best = p; }
          }
          if (best) {
            fp.x = best.reduce((s, q) => s + q[0], 0) / best.length;
            fp.z = best.reduce((s, q) => s + q[1], 0) / best.length;
          }
        }

        // clear of walls, and clear of everything already settled
        if (walls.length > 0 && prefersWall(f.name, f.modelId)) {
          const snap = snapToWall(fp, walls, 0.8);
          if (snap.snapped) fp = { ...fp, x: snap.x, z: snap.z, rotation: snap.rotation };
        }
        fp = resolveCollision(fp, settled);
        settled.push(fp);

        const dx = Math.abs(fp.x - f.position[0]), dz = Math.abs(fp.z - f.position[2]);
        if (dx > 0.01 || dz > 0.01) moved++;

        return {
          ...f,
          position: [fp.x, supportHeightAt(fp.x, fp.z, f, f.id), fp.z] as [number, number, number],
          rotation: fp.rotation,
        };
      });
      return next;
    });

    if (moved > 0) {
      setRevalidateNote(`${moved} item${moved !== 1 ? "s" : ""} repositioned after the layout changed.`);
      setTimeout(() => setRevalidateNote(null), 6000);
    }
  };

  // Only when the layout actually changes — never on first load, which would
  // move furniture the user deliberately placed.
  useEffect(() => {
    const sig = JSON.stringify([
      rfWalls.map(w => [w.x1, w.y1, w.x2, w.y2, w.thickness]),
      rooms.map(r => r.id),
    ]);
    if (!layoutSig.current) { layoutSig.current = sig; return; }
    if (sig === layoutSig.current) return;
    layoutSig.current = sig;
    if (placedFurniture.length > 0) revalidatePlacements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfWalls, rooms]);

  const handleAssistantCommand = async (command: string): Promise<boolean> => {
    if (FURNISH_VERB.test(command) && FURNISH_NOUN.test(command)) {
      return handleFurnish(command);
    }
    return handleSceneRender(command);
  };

  // ── Share (public read-only link) ──────────────────────────────────────────
  const [shareOpen, setShareOpen] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareEnabled, setShareEnabled] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  const shareUrl = shareToken && typeof window !== "undefined"
    ? `${window.location.origin}/share/${shareToken}`
    : null;

  const handleToggleShare = async (enabled: boolean) => {
    if (!currentProject?.id || shareBusy) return;
    setShareBusy(true);
    try {
      const data = await toggleShare(currentProject.id, enabled);
      setShareEnabled(data.share_enabled);
      setShareToken(data.share_token);
    } catch (err) {
      console.error("Share toggle failed:", err);
    } finally {
      setShareBusy(false);
    }
  };

  const handleCopyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch { /* clipboard unavailable — user can select manually */ }
  };

  // ── Export (PNG snapshot / GLB model) ──────────────────────────────────────
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const exportFileBase = (currentProject?.name || "nooi-design")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "nooi-design";

  const triggerDownload = (href: string, filename: string) => {
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleExportPng = () => {
    setExportMenuOpen(false);
    const dataUrl = sceneRef.current?.captureImage();
    if (!dataUrl) return;
    triggerDownload(dataUrl, `${exportFileBase}.png`);
  };

  const handleExportGlb = async () => {
    setExportMenuOpen(false);
    if (!sceneRef.current?.exportGlb) return;
    setExporting(true);
    try {
      const blob = await sceneRef.current.exportGlb();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      triggerDownload(url, `${exportFileBase}.glb`);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err) {
      console.error("GLB export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#f5f5f5] overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Navbar */}
      <header className="h-[56px] border-b border-[#e5e5e5] bg-white flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/dashboard")} className="flex items-center gap-1 px-2 py-1.5 hover:bg-[#fafafa] rounded-full text-[12px] font-medium text-[#525252]">
            <ChevronLeft size={16} />Dashboard
          </button>
          <div className="h-5 w-px bg-[#e5e5e5]" />
          <div className="w-7 h-7 bg-[#c7de7d] rounded-[10px] flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#003832" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>
            </svg>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-[14px] font-semibold text-[#0a0a0a]">{currentProject?.name || "Untitled Project"}</span>
            <span className="text-[12px] text-[#737373]">— {viewMode === "3d" ? "3D Scene" : "Floor plan"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">

          {/* Undo / redo */}
          {!walkthroughActive && (
            <div className="flex items-center gap-0.5 mr-1">
              <button
                onClick={undo}
                disabled={!canUndo}
                title={`Undo (${undoHint})`}
                className="w-8 h-8 flex items-center justify-center rounded-full border border-[#e5e5e5] text-[#525252] hover:bg-gray-50 disabled:opacity-35 disabled:hover:bg-transparent"
              >
                <Undo2 size={14} />
              </button>
              <button
                onClick={redo}
                disabled={!canRedo}
                title={`Redo (${redoHint})`}
                className="w-8 h-8 flex items-center justify-center rounded-full border border-[#e5e5e5] text-[#525252] hover:bg-gray-50 disabled:opacity-35 disabled:hover:bg-transparent"
              >
                <Redo2 size={14} />
              </button>
            </div>
          )}

          {/* Furniture count — hidden during walkthrough to save header space */}
          {viewMode === "3d" && !walkthroughActive && placedFurniture.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f0f7f6] border border-[#c7de7d] rounded-full text-[12px] font-medium text-[#004643]">
              <Sofa size={12} />{placedFurniture.length} item{placedFurniture.length !== 1 ? "s" : ""}
            </div>
          )}

          {/* ── Walkthrough idle: start button ── */}
          {viewMode === "3d" && !walkthroughActive && (
            <button
              id="btn-walkthrough-start"
              onClick={startWalkthrough}
              disabled={rooms.length < 2}
              title={rooms.length < 2 ? "Need at least 2 rooms" : "Start 3D walkthrough"}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[#004643] rounded-full text-[12px] font-medium text-[#004643] hover:bg-[#f0f7f6] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Video size={13} />Walkthrough
            </button>
          )}

          {/* ── Walkthrough active: live control bar ── */}
          {viewMode === "3d" && walkthroughActive && (
            <>
              {/* Progress pill & active room status */}
              <div className="flex items-center gap-2 px-3.5 py-1.5 bg-[#f0f7f6] border border-[#c7de7d] rounded-full">
                <div className="w-[64px] h-[4px] bg-[#e0e0e0] rounded-full overflow-hidden shrink-0">
                  <div
                    className="h-full bg-[#004643] rounded-full"
                    style={{ width: `${Math.round(walkthroughProgress * 100)}%`, transition: "width 0.1s linear" }}
                  />
                </div>
                <span className="text-[11px] font-semibold text-[#004643] tabular-nums shrink-0">
                  {Math.round(walkthroughProgress * 100)}%
                </span>
                {walkthroughStatusText && (
                  <>
                    <div className="w-px h-3 bg-[#c7de7d] shrink-0" />
                    <span className="text-[11px] font-medium text-[#003832] truncate max-w-[260px]">
                      {walkthroughStatusText}
                    </span>
                  </>
                )}
              </div>

              {/* Pause / Resume */}
              <button
                id="btn-walkthrough-pause"
                onClick={togglePause}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-[#e5e5e5] rounded-full hover:bg-[#f5f5f5] text-[12px] font-medium text-[#525252] transition-all"
              >
                {walkthroughPaused
                  ? <><Play size={13} />Resume</>
                  : <><Pause size={13} />Pause</>}
              </button>

              {/* Stop */}
              <button
                id="btn-walkthrough-stop"
                onClick={stopWalkthrough}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-[#e5e5e5] rounded-full hover:bg-[#f5f5f5] text-[12px] font-medium text-[#525252] transition-all"
              >
                <Square size={11} fill="currentColor" />Stop
              </button>

              {/* Record / Save .webm */}
              <button
                id="btn-walkthrough-record"
                onClick={toggleRecording}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all border ${
                  isRecording
                    ? "bg-[#ef4444] text-white border-[#ef4444] hover:bg-[#dc2626]"
                    : "border-[#e5e5e5] text-[#525252] hover:bg-[#f5f5f5]"
                }`}
              >
                {isRecording
                  ? <><Square size={11} fill="currentColor" />Save .webm</>
                  : <><Circle size={11} className="text-[#ef4444]" fill="currentColor" />Record</>}
              </button>
            </>
          )}

          <button
            onClick={() => setShareOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#e5e5e5] rounded-full hover:bg-gray-50 text-[12px] font-medium text-[#525252]"
          >
            <Share2 size={14} />Share
          </button>
          <div className="relative">
            <button
              onClick={() => setExportMenuOpen(o => !o)}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#004643] rounded-full hover:bg-[#003633] text-[12px] font-medium text-white disabled:opacity-60"
            >
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Export
            </button>
            {exportMenuOpen && (
              <>
                {/* click-away backdrop */}
                <div className="fixed inset-0 z-40" onClick={() => setExportMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1.5 z-50 w-[230px] bg-white border border-[#e5e5e5] rounded-[12px] shadow-[0_12px_24px_-4px_rgba(0,0,0,0.12)] py-1.5">
                  <button
                    onClick={handleExportPng}
                    disabled={viewMode !== "3d"}
                    className="w-full flex items-start gap-2.5 px-3.5 py-2 hover:bg-[#fafafa] disabled:opacity-40 disabled:cursor-not-allowed text-left"
                  >
                    <ImageIcon size={15} className="mt-[1px] shrink-0 text-[#004643]" />
                    <span>
                      <span className="block text-[12px] font-medium text-[#0a0a0a]">Export as image</span>
                      <span className="block text-[11px] text-[#737373]">PNG snapshot of the current view</span>
                    </span>
                  </button>
                  <button
                    onClick={handleExportGlb}
                    disabled={viewMode !== "3d" || exporting}
                    className="w-full flex items-start gap-2.5 px-3.5 py-2 hover:bg-[#fafafa] disabled:opacity-40 disabled:cursor-not-allowed text-left"
                  >
                    <Box size={15} className="mt-[1px] shrink-0 text-[#004643]" />
                    <span>
                      <span className="block text-[12px] font-medium text-[#0a0a0a]">Export as 3D model</span>
                      <span className="block text-[11px] text-[#737373]">GLB file with rooms &amp; furniture</span>
                    </span>
                  </button>
                  {viewMode !== "3d" && (
                    <p className="px-3.5 pt-1.5 pb-1 text-[11px] text-[#a3a3a3] border-t border-[#f0f0f0] mt-1">
                      Switch to 3D view to export
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-row flex-1 overflow-hidden p-3 gap-3 min-w-0">

        {/* Left Panel */}
        <aside className="shrink-0 bg-white flex flex-col overflow-visible rounded-[16px] border border-[#e5e5e5] shadow-[0_12px_24px_-4px_rgba(0,0,0,0.06)]" style={{ width: 280 }}>
          <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
            <div className="w-[26px] h-[26px] rounded-full bg-[#003832] flex items-center justify-center shrink-0">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4" stroke="white" strokeWidth="1.2"/><circle cx="6" cy="6" r="1.5" fill="white"/></svg>
            </div>
            <span className="text-[13px] font-semibold text-[#0a0a0a]">AI Design Assistant</span>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-4 flex flex-col gap-3">
            <div className="bg-[#f5f5f5] rounded-[10px] px-3.5 py-3">
              <p className="text-[12px] leading-[1.55] text-[#404040]">
                {viewMode === "3d"
                  ? "Drag furniture from the right panel into the 3D scene. Click to select, then rotate or delete."
                  : "Describe the room or style you want and I'll generate a design for you."}
              </p>
            </div>
            {isGeneratingRender && (
              <div className="bg-[#f5f5f5] rounded-[10px] px-3.5 py-4 flex items-center gap-2.5">
                <Loader2 size={14} className="animate-spin text-[#004643]" />
                <p className="text-[12px] text-[#404040]">Generating your design…</p>
              </div>
            )}
            {isFurnishing && (
              <div className="bg-[#f5f5f5] rounded-[10px] px-3.5 py-4 flex items-center gap-2.5">
                <Loader2 size={14} className="animate-spin text-[#004643]" />
                <p className="text-[12px] text-[#404040]">Choosing and placing furniture…</p>
              </div>
            )}
            {revalidateNote && (
              <div className="rounded-[10px] px-3.5 py-3 border bg-[#fffbeb] border-[#fde68a]">
                <p className="text-[12px] leading-[1.55] text-[#92400e]">{revalidateNote}</p>
              </div>
            )}
            {assistantMsg && !isFurnishing && (
              <div className={`rounded-[10px] px-3.5 py-3 border ${
                assistantMsg.kind === "ok"
                  ? "bg-[#f0f7f6] border-[#c7de7d]"
                  : "bg-[#fef2f2] border-[#fecaca]"
              }`}>
                <p className={`text-[12px] leading-[1.55] ${
                  assistantMsg.kind === "ok" ? "text-[#004643]" : "text-[#b91c1c]"
                }`}>{assistantMsg.text}</p>
              </div>
            )}
            {renderError && (
              <div className="bg-[#fef2f2] border border-[#fecaca] rounded-[10px] px-3.5 py-3">
                <p className="text-[12px] text-[#b91c1c]">{renderError}</p>
              </div>
            )}
            {generatedImageUrl && !isGeneratingRender && (
              <button
                onClick={() => { setCompareMode(false); setViewerUrl(generatedImageUrl); }}
                className="group relative rounded-[10px] overflow-hidden border border-[#e5e5e5] block w-full"
                title="View full size"
              >
                <img src={generatedImageUrl} alt="AI render" className="w-full h-auto block" />
                <span className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 px-2.5 py-1.5 bg-white/95 rounded-full text-[11px] font-medium text-[#0a0a0a]">
                    <Maximize2 size={12} />View full size
                  </span>
                </span>
              </button>
            )}
            {renders.length > 1 && (
              <div>
                <p className="text-[10px] font-semibold text-[#737373] tracking-[0.06em] uppercase mb-2">
                  Renders ({renders.length})
                </p>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                  {renders.map(r => (
                    <button
                      key={r.at}
                      onClick={() => {
                        setGeneratedImageUrl(r.url);
                        setCompareMode(false);
                        setViewerUrl(r.url);
                      }}
                      className={`shrink-0 w-[64px] h-[48px] rounded-[8px] overflow-hidden border transition-all hover:scale-105 ${
                        generatedImageUrl === r.url ? "border-[#004643] ring-2 ring-[#c7de7d]" : "border-[#e5e5e5]"
                      }`}
                    >
                      <img src={r.url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {viewMode === "3d" && selectedFurniture && (
              <div className="bg-[#f0f7f6] border border-[#c7de7d] rounded-[12px] p-3">
                <p className="text-[11px] font-semibold text-[#004643] mb-1">Selected: {selectedFurniture.name}</p>
                <p className="text-[10px] text-[#737373] mb-3">{selectedFurniture.width} × {selectedFurniture.depth} cm</p>
                <div className="flex gap-2">
                  <button onClick={handleRotate} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white border border-[#e5e5e5] rounded-[8px] text-[11px] font-medium text-[#525252] hover:border-[#004643] hover:text-[#004643] transition-all">
                    <RotateCw size={12} />Rotate
                  </button>
                  <button onClick={handleDelete} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white border border-[#e5e5e5] rounded-[8px] text-[11px] font-medium text-[#ef4444] hover:border-[#ef4444] transition-all">
                    <Trash2 size={12} />Delete
                  </button>
                </div>
              </div>
            )}
          </div>

          <CanvasPromptBox
            projectId={currentProject?.id}
            onCommand={handleAssistantCommand}
            onGenerateStart={() => { setIsGeneratingRender(true); setRenderError(null); }}
            onGenerateSuccess={url => {
              setGeneratedImageUrl(url);
              setRenders(prev => [{ url, at: Date.now() }, ...prev]);
              setCompareMode(false);
              setViewerUrl(url);
              setIsGeneratingRender(false);
            }}
            onGenerateError={msg => { setRenderError(msg); setIsGeneratingRender(false); }}
          />
        </aside>

        {/* Center Canvas */}
        <main
          ref={canvasRef}
          className={`flex-1 flex flex-col min-w-0 overflow-hidden relative bg-white rounded-[16px] shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all border ${
            isDragOverCanvas && viewMode === "3d" ? "border-[#004643] border-2" : "border-[#e5e5e5]"
          }`}
          onDragOver={e => { e.preventDefault(); if (viewMode === "3d") setIsDragOverCanvas(true); }}
          onDragLeave={() => setIsDragOverCanvas(false)}
          onDrop={handleDrop3D}
        >
          {/* 2D / 3D toggle */}
          <div className="absolute top-[18px] left-1/2 -translate-x-1/2 z-10 bg-white border border-[#e5e5e5] rounded-full p-[5px] flex items-center gap-[4px] shadow-[0px_4px_6px_rgba(0,0,0,0.05)]">
            {(["2d", "3d"] as const).map(mode => (
              <button
                key={mode}
                onClick={() => {
                  // Stop walkthrough (and any recording) when switching to 2D
                  if (mode === "2d" && walkthroughActive) { stopWalkthrough(); }
                  setViewMode(mode);
                }}
                className={`flex items-center gap-[6px] px-[16px] py-[6px] rounded-full text-[12px] font-medium transition-all whitespace-nowrap ${
                  viewMode === mode ? "bg-[#003832] text-white shadow-sm" : "text-[#525252] hover:text-[#0a0a0a] hover:bg-[#f5f5f5]"
                }`}
              >
                {mode === "2d" ? "2D Floor Plan" : "3D Walkthrough"}
              </button>
            ))}
          </div>

          {/* Drop hint */}
          {viewMode === "3d" && isDragOverCanvas && (
            <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
              <div className="bg-[#004643] text-white px-6 py-3 rounded-full text-[14px] font-semibold shadow-lg">Drop to place furniture</div>
            </div>
          )}

          {/* Toast Notification */}
          {toast && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-[#0a0a0a]/90 text-white border border-[#c7de7d]/40 shadow-xl px-4 py-2.5 rounded-full backdrop-blur-md transition-all">
              <span className="text-[12px] font-medium">{toast}</span>
              {toastAction && (
                <button
                  onClick={toastAction.onClick}
                  className="px-3 py-1 bg-[#004643] hover:bg-[#003633] text-white rounded-full text-[11px] font-semibold transition"
                >
                  {toastAction.label}
                </button>
              )}
            </div>
          )}

          {/* 3D controls hint — adapts to walkthrough state */}
          {viewMode === "3d" && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-4 bg-black/50 backdrop-blur-sm text-white/80 text-[11px] px-4 py-2 rounded-full pointer-events-none">
              {walkthroughActive && !walkthroughPaused ? (
                <><span>🎬 Walkthrough playing</span><span className="opacity-40">·</span><span>⏸ Pause to orbit freely</span></>
              ) : walkthroughActive && walkthroughPaused ? (
                <><span>⏸ Paused — orbit freely</span><span className="opacity-40">·</span><span>▶ Resume when ready</span></>
              ) : (
                cameraView === "inside"
                  ? <><span>🖱 Drag to look</span><span>⚡ Scroll to fly</span><span>⌨ WASD to move</span><span>⬆ Q/E or Shift/Space for Up/Down</span></>
                  : <><span>🖱 Drag to orbit</span><span>⚡ Scroll to zoom</span><span>✋ Right-click to pan</span><span>⌨ WASD / Arrows to shift camera</span></>
              )}
            </div>
          )}

          {/* Camera view presets — hidden while a walkthrough is playing */}
          {viewMode === "3d" && !(walkthroughActive && !walkthroughPaused) && (
            <div className="absolute bottom-5 right-5 z-10 flex items-center gap-0.5 bg-black/50 backdrop-blur-sm rounded-full p-1">
              {(["default", "top", "front", "inside"] as CameraViewPreset[]).map(v => (
                <button
                  key={v}
                  onClick={() => handleCameraView(v)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors ${
                    cameraView === v
                      ? "bg-white text-[#0a0a0a]"
                      : "text-white/75 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {v === "default" ? "3D" : v === "top" ? "Top" : v === "front" ? "Front" : "Inside"}
                </button>
              ))}
            </div>
          )}

          {/* Render this view — photorealistic image of exactly what's framed */}
          {viewMode === "3d" && !(walkthroughActive && !walkthroughPaused) && (
            <button
              onClick={() => handleSceneRender("")}
              disabled={isGeneratingRender}
              title="Turn the current view into a photorealistic image"
              className="absolute bottom-[68px] right-5 z-10 flex items-center gap-2 pl-3.5 pr-4 py-2 rounded-full bg-[#004643] hover:bg-[#003633] disabled:opacity-70 text-white text-[12px] font-medium shadow-[0_4px_12px_rgba(0,0,0,0.25)] transition-colors"
            >
              {isGeneratingRender
                ? <><Loader2 size={14} className="animate-spin" />Rendering…</>
                : <><Camera size={14} />Render view</>}
            </button>
          )}

          {/* 2D View */}
          {viewMode === "2d" && (
            <div
              className="flex-1 overflow-hidden relative flex items-center justify-center"
              style={{ backgroundColor: "#e8e8e8" }}
              onClick={() => setSelectedRoomId(null)}
            >
              {/* Room drawing tools */}
              <div
                className="absolute top-4 left-4 z-20 flex items-center gap-1 bg-white
                           border border-[#e5e5e5] rounded-full p-1 shadow-sm"
                onClick={e => e.stopPropagation()}
              >
                <span className="pl-2.5 pr-1 text-[11px] text-[#737373]">Add room</span>
                <button
                  onClick={() => setDrawShape(drawShape === "rect" ? null : "rect")}
                  title="Draw a rectangular room"
                  className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
                    drawShape === "rect"
                      ? "bg-[#004643] text-white"
                      : "text-[#525252] hover:bg-[#f5f5f5]"}`}
                >
                  <Square size={13} />   {/* already imported for walkthrough stop */}
                </button>
                <button
                  onClick={() => setDrawShape(drawShape === "circle" ? null : "circle")}
                  title="Draw a round room"
                  className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
                    drawShape === "circle"
                      ? "bg-[#004643] text-white"
                      : "text-[#525252] hover:bg-[#f5f5f5]"}`}
                >
                  <Circle size={13} />
                </button>
                {drawShape && (
                  <span className="pl-1.5 pr-2.5 text-[11px] text-[#004643] font-medium">
                    drag on the plan
                  </span>
                )}
                {savingRoom && (
                  <Loader2 size={13} className="mr-2 animate-spin text-[#004643]" />
                )}
              </div>

              <div style={{ transform: `scale(${zoom / 100})` }} className="transition-transform duration-100 origin-center">
                <div
                  className="bg-white border border-[#d4d4d4] rounded-[12px] shadow-lg relative overflow-hidden flex items-center justify-center"
                  style={{ width: 720, height: 560 }}
                  onClick={e => e.stopPropagation()}
                >
                  {floorPlanUrl ? (
                    <>
                      {/* True-shape SVG polygon overlay: polygons render inside
                          the SAME viewBox as the image, so alignment is
                          guaranteed at any zoom or container size. */}
                      <div
                        style={
                          imageSize && imageSize.width > 0 && imageSize.height > 0
                            ? (() => {
                                const containerW = 680, containerH = 520;
                                const imgRatio = imageSize.width / imageSize.height;
                                const boxRatio = containerW / containerH;
                                return imgRatio > boxRatio
                                  ? { width: containerW }
                                  : { width: containerH * imgRatio };
                              })()
                            : { width: 680 }
                        }
                      >
                        {mounted && (
                          <FloorplanPolygonOverlay
                            imageUrl={floorPlanUrl}
                            rooms={rooms}
                            selectedRoomId={selectedRoomId}
                            onRoomClick={(id) =>
                              setSelectedRoomId(selectedRoomId === id ? null : id)
                            }
                            drawShape={drawShape}
                            onDrawComplete={handleDrawComplete}
                          />
                        )}
                      </div>

                      {loadingRooms && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/80">
                          <Loader2 size={22} className="animate-spin text-[#004643]" />
                          <span className="text-sm text-gray-500">Analysing floor plan…</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 text-gray-300 select-none">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect width="18" height="18" x="3" y="3" rx="2"/>
                        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                      </svg>
                      <span className="text-sm font-medium">No Floor Plan Uploaded</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Zoom controls */}
              <div className="absolute bottom-5 right-5 z-10 flex items-center gap-1 bg-white border border-[#e8eceb] rounded-[10px] shadow-sm px-3 py-2">
                <button onClick={() => setZoom(z => Math.max(25, z - 10))} className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#f5f7f6]"><Minus size={15} /></button>
                <span className="text-[13px] font-medium w-[44px] text-center">{zoom}%</span>
                <button onClick={() => setZoom(z => Math.min(200, z + 10))} className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#f5f7f6]"><Plus size={15} /></button>
                <div className="w-px h-5 bg-[#e8eceb] mx-1" />
                <button onClick={() => setZoom(100)} className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#f5f7f6]"><RotateCcw size={14} /></button>
              </div>
            </div>
          )}

          {/* 3D View */}
          {viewMode === "3d" && (
            <div className="flex-1 overflow-hidden">
              {mounted && (
                <ThreeSceneV2
                  ref={sceneRef}
                  roomWidthCm={roomDimensionsCm.width}
                  roomDepthCm={roomDimensionsCm.depth}
                  rooms={rooms}
                  rfWalls={rfWalls}
                  openings={openings}
                  furniture={placedFurniture}
                  onFurnitureSelect={(id) => {
                    setSelectedFurnitureId(id);
                    if (id) { setSelectedWall(null); setSelectedDoor(null); }
                  }}
                  onFurnitureMove={handleFurnitureMove}
                  onFurnitureRotate={handleFurnitureRotate}
                  selectedFurnitureId={selectedFurnitureId}
                  wallColors={wallColors}
                  wallSurfaces={wallSurfaces}
                  doorFinishes={doorFinishes}
                  onDoorKeys={setDoorKeys}
                  selectedDoorKey={selectedDoor}
                  onDoorSelect={(key) => {
                    setSelectedDoor(key);
                    if (key) {
                      setSelectedFurnitureId(null);
                      setSelectedWall(null);
                      setRightTab("edit");
                    }
                  }}
                  selectedWallSide={selectedWall ? wallKeyOf(selectedWall) : null}
                  onWallSelect={(sel) => {
                    setSelectedWall(sel);
                    if (sel) { setSelectedFurnitureId(null); setSelectedDoor(null); setRightTab("edit"); }
                  }}
                  walkthroughActive={walkthroughActive}
                  walkthroughPaused={walkthroughPaused}
                  onWalkthroughProgress={(prog, info) => {
                    setWalkthroughProgress(prog);
                    if (info?.statusText) setWalkthroughStatusText(info.statusText);
                  }}
                />
              )}
            </div>
          )}
        </main>

        {/* Right Panel */}
        <aside className="shrink-0 bg-white flex flex-col overflow-hidden rounded-[16px] border border-[#e5e5e5] shadow-[0_12px_24px_-4px_rgba(0,0,0,0.06)]" style={{ width: 280 }}>
          <div className="flex items-center px-3 pt-3 pb-2">
            <div className="flex bg-[#f5f5f5] rounded-full p-[3px] flex-1">
              {(["elements", "edit"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setRightTab(tab)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-[5.5px] rounded-full text-[12px] font-medium transition-all ${
                    rightTab === tab ? "bg-white text-[#0a0a0a] shadow-sm" : "text-[#737373] hover:text-[#0a0a0a]"
                  }`}
                >
                  {tab === "elements" ? <><Sofa size={13} /><span>Elements</span></> : <><SlidersHorizontal size={13} /><span>Edit</span></>}
                </button>
              ))}
            </div>
          </div>

          {rightTab === "elements" ? (
            <div className="flex-1 overflow-hidden px-3 pb-3">
              {viewMode === "3d" ? (
                <FurnitureLibrary
                  onQuickAdd={(cat) => addFurniture(cat, [0, 0, 0])}
                />
              ) : (
                <div className="flex flex-col items-center py-6 gap-2 text-center">
                  <p className="text-[11px] text-[#a3a3a3]">Switch to 3D view to place furniture</p>
                  <button onClick={() => setViewMode("3d")} className="px-4 py-2 bg-[#003832] text-white text-[11px] font-medium rounded-full hover:bg-[#004643] transition-colors">Switch to 3D →</button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto scrollbar-hide px-3 py-4">
              {viewMode === "2d" && selectedRoom ? (
                <div className="flex flex-col gap-4">
                  <div>
                    <input
                      value={selectedRoom.name}
                      onChange={e => setRooms(prev => prev.map(r =>
                        r.id === selectedRoom.id ? { ...r, name: e.target.value } : r))}
                      onBlur={() => currentProject?.id && saveRooms(currentProject.id, rooms as any)
                        .catch(err => console.error("Failed to save room name:", err))}
                      className="w-full text-[13px] font-semibold text-[#0a0a0a] bg-transparent
                                 border-b border-transparent hover:border-[#e5e5e5]
                                 focus:border-[#004643] focus:outline-none pb-0.5"
                    />
                    <p className="text-[11px] text-[#a3a3a3] mt-1">
                      Measurements detected from the plan. Correct them if they're wrong —
                      everything else scales from these.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] font-semibold text-[#737373] tracking-[0.06em] uppercase">Width (m)</span>
                      <input
                        type="number" min="0.5" step="0.1"
                        value={dimDraft?.w ?? ""}
                        onChange={e => setDimDraft(d => ({ w: e.target.value, l: d?.l ?? "" }))}
                        className="px-2.5 py-2 border border-[#e5e5e5] rounded-[8px] text-[13px]
                                   focus:outline-none focus:ring-2 focus:ring-[#c7de7d]"
                        placeholder="—"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] font-semibold text-[#737373] tracking-[0.06em] uppercase">Length (m)</span>
                      <input
                        type="number" min="0.5" step="0.1"
                        value={dimDraft?.l ?? ""}
                        onChange={e => setDimDraft(d => ({ w: d?.w ?? "", l: e.target.value }))}
                        className="px-2.5 py-2 border border-[#e5e5e5] rounded-[8px] text-[13px]
                                   focus:outline-none focus:ring-2 focus:ring-[#c7de7d]"
                        placeholder="—"
                      />
                    </label>
                  </div>

                  {dimDraft && parseFloat(dimDraft.w) > 0 && parseFloat(dimDraft.l) > 0 && (
                    <p className="text-[11px] text-[#737373]">
                      Floor area ≈ {(parseFloat(dimDraft.w) * parseFloat(dimDraft.l)).toFixed(1)} m²
                    </p>
                  )}

                  <button
                    onClick={saveRoomDimensions}
                    disabled={
                      savingDims || !dimDraft ||
                      !(parseFloat(dimDraft.w) > 0) || !(parseFloat(dimDraft.l) > 0) ||
                      (parseFloat(dimDraft.w) === selectedRoom.width &&
                       parseFloat(dimDraft.l) === selectedRoom.length)
                    }
                    className="w-full py-2 rounded-[8px] bg-[#004643] hover:bg-[#003633] text-white
                               text-[12px] font-medium disabled:opacity-40"
                  >
                    {savingDims ? "Saving…" : "Save measurements"}
                  </button>

                  <p className="text-[10.5px] text-[#a3a3a3] leading-[1.5]">
                    Changing a room's size rescales the plan, so furniture may be
                    repositioned to stay inside the walls.
                  </p>
                </div>
              ) : selectedFurniture ? (
                <FurnitureInspector
                  item={selectedFurniture}
                  onChange={patchSelected}
                  onDelete={handleDelete}
                />
              ) : selectedDoor ? (
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-[13px] font-semibold text-[#0a0a0a]">Door finish</p>
                    <p className="text-[11px] text-[#a3a3a3] mt-0.5">
                      Choose the wood for this door.
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {DOOR_FINISHES.map(f => {
                      const active = doorFinishes[selectedDoor] === f.id;
                      return (
                        <button
                          key={f.id}
                          onClick={() => setDoorFinishes(prev => ({ ...prev, [selectedDoor]: f.id }))}
                          className={`rounded-[8px] overflow-hidden border text-left transition hover:shadow-sm ${
                            active ? "border-[#004643] ring-2 ring-[#c7de7d]" : "border-[#e5e5e5]"
                          }`}
                          title={f.name}
                        >
                          <div className="aspect-[2/3] bg-[#fafafa]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={f.thumbnail ?? f.map} alt={f.name}
                                 className="w-full h-full object-cover" loading="lazy" />
                          </div>
                          <p className="px-1.5 py-1 text-[9.5px] font-medium text-[#525252] truncate">
                            {f.name}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        const v = doorFinishes[selectedDoor];
                        if (!v) return;
                        // use the keys the scene reported — rebuilding them
                        // here is what previously made this silently no-op
                        const all: Record<string, string> = { ...doorFinishes };
                        for (const k of doorKeys) all[k] = v;
                        setDoorFinishes(all);
                      }}
                      disabled={!doorFinishes[selectedDoor]}
                      className="w-full py-2 rounded-[8px] border border-[#e5e5e5] text-[11px] font-medium text-[#525252] hover:bg-[#fafafa] disabled:opacity-40"
                    >
                      Apply to all doors{doorKeys.length > 1 ? ` (${doorKeys.length})` : ""}
                    </button>
                    <button
                      onClick={() => setDoorFinishes(prev => {
                        const next = { ...prev };
                        delete next[selectedDoor];
                        return next;
                      })}
                      disabled={!doorFinishes[selectedDoor]}
                      className="w-full py-2 rounded-[8px] border border-[#e5e5e5] text-[11px] font-medium text-[#b91c1c] hover:bg-[#fef2f2] disabled:opacity-40"
                    >
                      Reset this door
                    </button>
                  </div>
                </div>
              ) : selectedWall ? (
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-[13px] font-semibold text-[#0a0a0a]">Wall finish</p>
                    <p className="text-[11px] text-[#a3a3a3] mt-0.5">
                      Wall {selectedWall.key} · {selectedWall.side === "A" ? "side 1" : "side 2"} — only this side changes.
                    </p>
                  </div>

                  {/* Paint | Surface */}
                  <div className="flex gap-1 p-1 bg-[#f5f5f5] rounded-[10px]">
                    {(["paint", "surface"] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setWallTab(t)}
                        className={`flex-1 py-1.5 rounded-[7px] text-[11px] font-medium transition-colors ${
                          wallTab === t ? "bg-white text-[#0a0a0a] shadow-sm" : "text-[#737373] hover:text-[#0a0a0a]"
                        }`}
                      >
                        {t === "paint" ? "Paint" : "Surface"}
                      </button>
                    ))}
                  </div>

                  {wallTab === "surface" ? (
                    <div className="flex flex-col gap-3">
                      {WALL_SURFACES.length === 0 ? (
                        <p className="text-[11px] text-[#a3a3a3] py-4 text-center">
                          No surfaces installed yet.
                        </p>
                      ) : (
                        <>
                          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
                            {(["all", ...activeSurfaceCategories()] as const).map(c => (
                              <button
                                key={c}
                                onClick={() => setSurfaceCat(c as SurfaceCategory | "all")}
                                className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium border transition ${
                                  surfaceCat === c
                                    ? "bg-[#004643] text-white border-[#004643]"
                                    : "bg-white text-[#525252] border-[#e5e5e5] hover:border-[#d4d4d4]"
                                }`}
                              >
                                {c === "all" ? "All" : SURFACE_CATEGORY_LABELS[c as SurfaceCategory]}
                              </button>
                            ))}
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {WALL_SURFACES
                              .filter(s => surfaceCat === "all" || s.category === surfaceCat)
                              .map(s => {
                                const active = wallSurfaces[wallKeyOf(selectedWall)] === s.id;
                                return (
                                  <button
                                    key={s.id}
                                    onClick={() => setWallSurfaces(prev => ({ ...prev, [wallKeyOf(selectedWall)]: s.id }))}
                                    className={`rounded-[8px] overflow-hidden border text-left transition hover:shadow-sm ${
                                      active ? "border-[#004643] ring-2 ring-[#c7de7d]" : "border-[#e5e5e5]"
                                    }`}
                                    title={s.name}
                                  >
                                    <div className="aspect-square bg-[#fafafa]">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={s.thumbnail ?? s.map} alt={s.name}
                                           className="w-full h-full object-cover" loading="lazy" />
                                    </div>
                                    <p className="px-1.5 py-1 text-[9.5px] font-medium text-[#525252] truncate">
                                      {s.name}
                                    </p>
                                  </button>
                                );
                              })}
                          </div>
                        </>
                      )}
                      {wallSurfaces[wallKeyOf(selectedWall)] && (
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => {
                              const v = wallSurfaces[wallKeyOf(selectedWall)];
                              setWallSurfaces(prev => ({
                                ...prev,
                                [`${selectedWall.key}:A`]: v,
                                [`${selectedWall.key}:B`]: v,
                              }));
                            }}
                            className="w-full py-2 rounded-[8px] border border-[#e5e5e5] text-[11px] font-medium text-[#525252] hover:bg-[#fafafa]"
                          >
                            Apply to both sides
                          </button>
                          <button
                            onClick={() => setWallSurfaces(prev => {
                              const next = { ...prev };
                              delete next[wallKeyOf(selectedWall)];
                              return next;
                            })}
                            className="w-full py-2 rounded-[8px] border border-[#e5e5e5] text-[11px] font-medium text-[#b91c1c] hover:bg-[#fef2f2]"
                          >
                            Remove surface
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                  <>
                  {wallSurfaces[wallKeyOf(selectedWall)] && (
                    <p className="text-[11px] text-[#a3a3a3] -mb-1">
                      This side has a surface applied — remove it to see paint.
                    </p>
                  )}
                  <div className="grid grid-cols-6 gap-2">
                    {WALL_PAINTS.map(c => {
                      const active = wallColors[wallKeyOf(selectedWall)] === c;
                      return (
                        <button
                          key={c}
                          onClick={() => setWallColors(prev => ({ ...prev, [wallKeyOf(selectedWall)]: c }))}
                          className={`w-full aspect-square rounded-[8px] border transition-transform hover:scale-105 ${
                            active ? "border-[#004643] ring-2 ring-[#c7de7d]" : "border-black/10"
                          }`}
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      );
                    })}
                  </div>
                  <label className="flex items-center justify-between gap-2 text-[11px] text-[#525252]">
                    Custom colour
                    <input
                      type="color"
                      value={wallColors[wallKeyOf(selectedWall)] ?? "#f2f0ec"}
                      onChange={(e) => {
                        const v = e.target.value;
                        setWallColors(prev => ({ ...prev, [wallKeyOf(selectedWall)]: v }));
                      }}
                      className="w-[42px] h-[26px] rounded cursor-pointer border border-[#e5e5e5] bg-white"
                    />
                  </label>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        const v = wallColors[wallKeyOf(selectedWall)];
                        if (!v) return;
                        setWallColors(prev => ({
                          ...prev,
                          [`${selectedWall.key}:A`]: v,
                          [`${selectedWall.key}:B`]: v,
                        }));
                      }}
                      className="w-full py-2 rounded-[8px] border border-[#e5e5e5] text-[11px] font-medium text-[#525252] hover:bg-[#fafafa]"
                    >
                      Apply to both sides
                    </button>
                    <button
                      onClick={() => setWallColors(prev => {
                        const next = { ...prev };
                        delete next[wallKeyOf(selectedWall)];
                        return next;
                      })}
                      className="w-full py-2 rounded-[8px] border border-[#e5e5e5] text-[11px] font-medium text-[#b91c1c] hover:bg-[#fef2f2]"
                    >
                      Reset this side
                    </button>
                  </div>
                  </>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-center py-10">
                  <Sofa size={28} className="text-[#d4d4d4]" />
                  <p className="text-[12px] font-semibold text-[#525252]">Nothing selected</p>
                  <p className="text-[11px] text-[#a3a3a3]">
                    {viewMode === "2d"
                      ? "Click a room in the floor plan to edit its measurements"
                      : "Click a furniture item, wall or door in the 3D scene to edit it"}
                  </p>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      {/* ── Render viewer ── */}
      {viewerUrl && (() => {
        const entry = renders.find(r => r.url === viewerUrl);
        const canCompare = !!entry?.source;
        return (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/80" onClick={() => setViewerUrl(null)} />
            <div className="relative z-10 flex flex-col items-center gap-3 max-h-full">
              <div className="relative rounded-[14px] overflow-hidden shadow-2xl bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={compareMode && entry?.source ? entry.source : viewerUrl}
                  alt="Render"
                  className="max-h-[76vh] max-w-[86vw] object-contain block"
                />
                {compareMode && (
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/70 text-white text-[11px] font-medium">
                    3D scene
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {canCompare && (
                  <button
                    onMouseDown={() => setCompareMode(true)}
                    onMouseUp={() => setCompareMode(false)}
                    onMouseLeave={() => setCompareMode(false)}
                    onTouchStart={() => setCompareMode(true)}
                    onTouchEnd={() => setCompareMode(false)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/12 hover:bg-white/20 text-white text-[12px] font-medium backdrop-blur-sm"
                  >
                    <ArrowLeftRight size={13} />Hold to compare
                  </button>
                )}
                <a
                  href={viewerUrl}
                  download={`${(currentProject?.name || "nooi-render").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white text-[#0a0a0a] text-[12px] font-medium hover:bg-white/90"
                >
                  <Download size={13} />Download
                </a>
                <button
                  onClick={() => setViewerUrl(null)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/12 hover:bg-white/20 text-white text-[12px] font-medium backdrop-blur-sm"
                >
                  <X size={13} />Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Share modal ── */}
      {shareOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShareOpen(false)} />
          <div className="relative z-10 w-[420px] max-w-[calc(100vw-32px)] bg-white rounded-[16px] shadow-[0_24px_48px_-8px_rgba(0,0,0,0.25)] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-semibold text-[#0a0a0a] flex items-center gap-2">
                <Share2 size={16} className="text-[#004643]" />Share design
              </h2>
              <button onClick={() => setShareOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f5f5f5]">
                <X size={15} />
              </button>
            </div>

            {/* toggle row */}
            <div className="flex items-center justify-between py-3 border-b border-[#f0f0f0]">
              <div>
                <p className="text-[13px] font-medium text-[#0a0a0a]">Public link</p>
                <p className="text-[11.5px] text-[#737373] mt-0.5">
                  Anyone with the link can view this design in 3D. They can't edit.
                </p>
              </div>
              <button
                onClick={() => handleToggleShare(!shareEnabled)}
                disabled={shareBusy}
                aria-label="Toggle public link"
                className={`relative w-[42px] h-[24px] rounded-full transition-colors shrink-0 ml-4 ${
                  shareEnabled ? "bg-[#004643]" : "bg-[#d4d4d4]"
                } ${shareBusy ? "opacity-60" : ""}`}
              >
                <span className={`absolute top-[3px] w-[18px] h-[18px] bg-white rounded-full shadow transition-all ${
                  shareEnabled ? "left-[21px]" : "left-[3px]"
                }`} />
              </button>
            </div>

            {/* link row */}
            {shareEnabled && shareUrl && (
              <div className="mt-4 flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-[#fafafa] border border-[#e5e5e5] rounded-[10px] min-w-0">
                  <Link2 size={13} className="shrink-0 text-[#737373]" />
                  <span className="text-[12px] text-[#525252] truncate select-all">{shareUrl}</span>
                </div>
                <button
                  onClick={handleCopyShareUrl}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-[#004643] hover:bg-[#003633] rounded-[10px] text-[12px] font-medium text-white shrink-0"
                >
                  {shareCopied ? <><Check size={13} />Copied</> : "Copy"}
                </button>
              </div>
            )}
            {!shareEnabled && (
              <p className="mt-4 text-[12px] text-[#a3a3a3]">
                Turn on the public link to get a shareable URL.
              </p>
            )}
          </div>
        </div>
      )}

      <style>{`
        .scrollbar-hide::-webkit-scrollbar{display:none}
        .scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}
      `}</style>
    </div>
  );
}