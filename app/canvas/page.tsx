"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Search, Minus, Plus, RotateCcw, Sofa,
  ChevronDown, ChevronLeft, Share2, Download,
  SlidersHorizontal, Loader2, RotateCw, Trash2,
} from "lucide-react";
import CanvasPromptBox from "@/components/CanvasPromptBox";
import { useProjectStore } from "@/lib/store";
import { getProject } from "@/lib/api/projects";
import { RoomOverlayBox, relayoutGrid, type GridRoom } from "@/components/RoomLayoutGrid";
import type { PlacedFurniture } from "@/components/ThreeScene";

// ─── Lazy-load Three.js (no SSR — Three.js requires browser APIs) ─────────────
const ThreeScene = dynamic(() => import("@/components/ThreeScene"), {
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
const FURNITURE_CATALOGUE = [
  {
    category: "Living Room",
    items: [
      { id: "sofa-3seat", name: "3-Seat Sofa", width: 220, depth: 90, height: 85, color: "#8a7156" },
      { id: "armchair", name: "Armchair", width: 85, depth: 80, height: 85, color: "#6b5d4f" },
      { id: "coffee-table", name: "Coffee Table", width: 120, depth: 60, height: 45, color: "#5c3d24" },
      { id: "tv-stand", name: "TV Stand", width: 180, depth: 45, height: 55, color: "#3d2f26" },
      { id: "bookshelf", name: "Bookshelf", width: 90, depth: 30, height: 180, color: "#4d3627" },
      { id: "floor-lamp", name: "Floor Lamp", width: 35, depth: 35, height: 160, color: "#c0a870" },
    ],
  },
  {
    category: "Bedroom",
    items: [
      { id: "king-bed", name: "King Bed", width: 200, depth: 220, height: 50, color: "#8d9fa0" },
      { id: "queen-bed", name: "Queen Bed", width: 160, depth: 200, height: 50, color: "#9aacad" },
      { id: "nightstand", name: "Nightstand", width: 55, depth: 45, height: 60, color: "#5c3d24" },
      { id: "wardrobe", name: "Wardrobe", width: 200, depth: 60, height: 220, color: "#4a3728" },
    ],
  },
  {
    category: "Dining",
    items: [
      { id: "dining-table-6", name: "Dining Table (6)", width: 200, depth: 90, height: 76, color: "#7a5c3c" },
      { id: "dining-chair", name: "Dining Chair", width: 45, depth: 50, height: 90, color: "#5c3d24" },
      { id: "sideboard", name: "Sideboard", width: 160, depth: 45, height: 80, color: "#4d3627" },
    ],
  },
  {
    category: "Office",
    items: [
      { id: "desk", name: "Desk", width: 160, depth: 70, height: 75, color: "#8a7156" },
      { id: "office-chair", name: "Office Chair", width: 65, depth: 65, height: 110, color: "#2d2d2d" },
    ],
  },
  {
    category: "Decor",
    items: [
      { id: "plant-large", name: "Large Plant", width: 50, depth: 50, height: 120, color: "#3a6b3a" },
      { id: "plant-small", name: "Small Plant", width: 25, depth: 25, height: 50, color: "#4d8b4d" },
      { id: "rug-large", name: "Rug (Large)", width: 200, depth: 140, height: 2, color: "#c4a882" },
    ],
  },
];

const PALETTE_COLORS = ["#f5f0e8", "#3d5a4c", "#8a8a8a", "#1a6b63", "#2e8b7a", "#e8c840"];
const SUGGESTION_CHIPS = ["Cozy Scandinavian living room", "Maximise natural light", "Modern minimalist bedroom"];
const FALLBACK_COLORS = ["#c3f4f0", "#b9eac5", "#87ddd7", "#f7dfad", "#d5dbda", "#ffc9c0"];

function toGridRoom(room: any, index: number): GridRoom {
  return {
    id: room.id, name: room.name,
    color: room.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length],
    box: room.box, gridRow: room.gridRow, gridCol: room.gridCol,
    rowWeight: room.rowWeight, colWeight: room.colWeight,
  };
}

const EDIT_COLORS = ["#8a7156","#5c3d24","#2d2d2d","#4a7c59","#7b9ab2","#c4a882","#f0ede8","#3d5a4c"];

export default function CanvasPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [rightTab, setRightTab] = useState<"elements" | "edit">("elements");
  const [zoom, setZoom] = useState(100);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilterChip, setActiveFilterChip] = useState("All");
  const [mounted, setMounted] = useState(false);

  const { currentProject, setProjectRooms, setProject } = useProjectStore();
  const [rooms, setRooms] = useState<GridRoom[]>([]);
  const [buildingPerimeter, setBuildingPerimeter] = useState<[number,number][] | null>(null);
  const [openings, setOpenings] = useState<Array<{type:'door'|'window';wall:'horizontal'|'vertical';x:number;y:number;width:number}>>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [loadingRooms, setLoadingRooms] = useState(false);

  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGeneratingRender, setIsGeneratingRender] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  const [placedFurniture, setPlacedFurniture] = useState<PlacedFurniture[]>([]);
  const [selectedFurnitureId, setSelectedFurnitureId] = useState<string | null>(null);
  const [isDragOverCanvas, setIsDragOverCanvas] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if ((currentProject?.rooms?.length ?? 0) > 0) {
      // Use Gemini box coordinates directly — do NOT relayout
      setRooms(currentProject!.rooms!.map(toGridRoom).filter((r: GridRoom) => r.box));
      return;
    }
    if (currentProject?.id) {
      setLoadingRooms(true);
      getProject(currentProject.id)
        .then(p => {
          const apiRooms = p.room_data?.rooms ?? [];
          const gridRooms = apiRooms.map(toGridRoom).filter((r: GridRoom) => r.box);
          setRooms(gridRooms);
          if (apiRooms.length > 0) setProjectRooms(apiRooms);
          if (p.room_data?.building_perimeter) {
            setBuildingPerimeter(p.room_data.building_perimeter);
          }
          if (p.room_data?.openings) {
            setOpenings(p.room_data.openings);
          }
          if (p.floor_plan_url && !floorPlanUrl) {
            setProject({ ...currentProject, floor_plan_url: p.floor_plan_url });
          }
        })
        .catch(err => console.error("Failed to load rooms:", err))
        .finally(() => setLoadingRooms(false));
    }
  }, [mounted, currentProject?.id]);

  // Resolve floor plan URL from either field name (store uses both)
  const floorPlanUrl = currentProject?.floor_plan_url || currentProject?.floorPlanUrl || null;

  const handleResizeRoom = (id: string, box: GridRoom["box"]) => {
    if (!box) return;
    setRooms(relayoutGrid(rooms.map(r => r.id === id ? { ...r, rowWeight: box.height, colWeight: box.width } : r)));
  };

  const handleSwapRooms = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    const a = rooms.find(r => r.id === draggedId);
    const b = rooms.find(r => r.id === targetId);
    if (!a || !b || a.gridRow === undefined || b.gridRow === undefined) return;
    setRooms(relayoutGrid(rooms.map(r => {
      if (r.id === draggedId) return { ...r, gridRow: b.gridRow, gridCol: b.gridCol, rowWeight: b.rowWeight, colWeight: b.colWeight };
      if (r.id === targetId) return { ...r, gridRow: a.gridRow, gridCol: a.gridCol, rowWeight: a.rowWeight, colWeight: a.colWeight };
      return r;
    })));
  };

  const handleDragStart = (e: React.DragEvent, item: any) => {
    e.dataTransfer.setData("furniture", JSON.stringify(item));
  };

  const handleDrop3D = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverCanvas(false);
    if (viewMode !== "3d") return;
    const data = e.dataTransfer.getData("furniture");
    if (!data) return;
    const item = JSON.parse(data);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 5;
    const z = ((e.clientY - rect.top) / rect.height - 0.5) * 4;
    const newItem: PlacedFurniture = {
      id: `${item.id}-${Date.now()}`,
      name: item.name,
      position: [x, 0, z],
      rotation: 0,
      scale: [1, 1, 1],
      color: item.color,
      width: item.width,
      depth: item.depth,
      height: item.height,
    };
    setPlacedFurniture(prev => [...prev, newItem]);
    setSelectedFurnitureId(newItem.id);
    setRightTab("edit");
  };

  const handleFurnitureMove = (id: string, position: [number, number, number]) => {
    setPlacedFurniture(prev => prev.map(f => f.id === id ? { ...f, position } : f));
  };

  const handleRotate = () => {
    if (!selectedFurnitureId) return;
    setPlacedFurniture(prev => prev.map(f => f.id === selectedFurnitureId ? { ...f, rotation: f.rotation + Math.PI / 4 } : f));
  };

  const handleDelete = () => {
    setPlacedFurniture(prev => prev.filter(f => f.id !== selectedFurnitureId));
    setSelectedFurnitureId(null);
  };

  const setColor = (color: string) => {
    setPlacedFurniture(prev => prev.map(f => f.id === selectedFurnitureId ? { ...f, color } : f));
  };

  const selectedFurniture = placedFurniture.find(f => f.id === selectedFurnitureId);

  // Compute overall floor plan dimensions in cm from room data.
  // The total_area gives us the scale — use the largest room dimensions
  // to size the 3D scene correctly.
  const roomDimensionsCm = (() => {
    if (rooms.length === 0) return { width: 500, depth: 400 };
    // Find total bounding box by looking at rightmost and bottommost room edges
    let maxRight = 0;
    let maxBottom = 0;
    rooms.forEach((r: any) => {
      if (r.box) {
        maxRight  = Math.max(maxRight,  (r.box.left + r.box.width));
        maxBottom = Math.max(maxBottom, (r.box.top  + r.box.height));
      }
    });
    // Scale: box coords are 0-100% of image. Use total_area to estimate real size.
    // Fallback: use largest real-world room dimensions as reference.
    const largestWidth  = Math.max(...rooms.map((r: any) => (r.width  || 0) * 100));
    const largestLength = Math.max(...rooms.map((r: any) => (r.length || 0) * 100));
    return {
      width: Math.max(largestWidth  * 2, 400),
      depth: Math.max(largestLength * 2, 400),
    };
  })();

  const filteredCatalogue = FURNITURE_CATALOGUE.map(cat => ({
    ...cat,
    items: cat.items.filter(item =>
      (activeFilterChip === "All" || cat.category === activeFilterChip) &&
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(cat => cat.items.length > 0);

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
          {viewMode === "3d" && placedFurniture.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f0f7f6] border border-[#c7de7d] rounded-full text-[12px] font-medium text-[#004643]">
              <Sofa size={12} />{placedFurniture.length} item{placedFurniture.length !== 1 ? "s" : ""}
            </div>
          )}
          <button className="flex items-center gap-1.5 px-3 py-1.5 border border-[#e5e5e5] rounded-full hover:bg-gray-50 text-[12px] font-medium text-[#525252]">
            <Share2 size={14} />Share
          </button>
          <button className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#004643] rounded-full hover:bg-[#003633] text-[12px] font-medium text-white">
            <Download size={14} />Export
          </button>
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
            {renderError && (
              <div className="bg-[#fef2f2] border border-[#fecaca] rounded-[10px] px-3.5 py-3">
                <p className="text-[12px] text-[#b91c1c]">{renderError}</p>
              </div>
            )}
            {generatedImageUrl && !isGeneratingRender && (
              <div className="rounded-[10px] overflow-hidden border border-[#e5e5e5]">
                <img src={generatedImageUrl} alt="AI render" className="w-full h-auto block" />
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

          <div className="px-4 pb-3">
            <p className="text-[10px] font-semibold text-[#737373] tracking-[0.06em] uppercase mb-3">Design Settings</p>
            <div className="flex gap-2 mb-3">
              {["Style", "Budget"].map(label => (
                <div key={label} className="flex-1 h-[30px] border border-[#e5e5e5] rounded-[8px] flex items-center justify-between px-2.5 cursor-pointer hover:border-[#d4d4d4]">
                  <span className="text-[11px] text-[#a3a3a3]">{label}</span>
                  <ChevronDown size={11} className="text-[#a3a3a3]" />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1 mb-4">
              <span className="text-[10px] text-[#a3a3a3] mr-1">Palette:</span>
              {PALETTE_COLORS.map((c, i) => (
                <button key={i} className="w-[16px] h-[16px] rounded-full border border-black/8 hover:scale-110 transition-transform" style={{ backgroundColor: c }} />
              ))}
            </div>
            <div className="flex flex-col gap-[6px] mb-4">
              {SUGGESTION_CHIPS.map(chip => (
                <button key={chip} className="flex items-center gap-1.5 text-left text-[11px] text-[#525252] hover:text-[#0a0a0a] transition-colors group">
                  <span className="text-[#a3a3a3] group-hover:text-[#525252] text-[11px]">+</span>
                  <span>{chip}</span>
                </button>
              ))}
            </div>
          </div>

          <CanvasPromptBox
            projectId={currentProject?.id}
            onGenerateStart={() => { setIsGeneratingRender(true); setRenderError(null); }}
            onGenerateSuccess={url => { setGeneratedImageUrl(url); setIsGeneratingRender(false); }}
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
                onClick={() => setViewMode(mode)}
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

          {/* Zoom (2D only) */}
          {viewMode === "2d" && (
            <div className="absolute bottom-5 right-5 z-10 flex items-center gap-1 bg-white border border-[#e8eceb] rounded-[10px] shadow-sm px-3 py-2">
              <button onClick={() => setZoom(z => Math.max(25, z - 10))} className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#f5f7f6]"><Minus size={15} /></button>
              <span className="text-[13px] font-medium w-[44px] text-center">{zoom}%</span>
              <button onClick={() => setZoom(z => Math.min(200, z + 10))} className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#f5f7f6]"><Plus size={15} /></button>
              <div className="w-px h-5 bg-[#e8eceb] mx-1" />
              <button onClick={() => setZoom(100)} className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#f5f7f6]"><RotateCcw size={14} /></button>
            </div>
          )}

          {/* 3D controls hint */}
          {viewMode === "3d" && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-4 bg-black/50 backdrop-blur-sm text-white/80 text-[11px] px-4 py-2 rounded-full pointer-events-none">
              <span>🖱 Drag to orbit</span>
              <span>⚡ Scroll to zoom</span>
              <span>✋ Right-click to pan</span>
            </div>
          )}

          {/* 2D View */}
          {viewMode === "2d" && (
            <div
              className="flex-1 overflow-hidden relative flex items-center justify-center"
              style={{
                backgroundColor: "#f7f8f8",
                backgroundImage: `linear-gradient(to right,rgba(0,0,0,0.04) 1px,transparent 1px),linear-gradient(to bottom,rgba(0,0,0,0.04) 1px,transparent 1px)`,
                backgroundSize: `${zoom * 0.4}px ${zoom * 0.4}px`,
              }}
              onClick={() => setSelectedRoomId(null)}
            >
              <div style={{ transform: `scale(${zoom / 100})` }} className="transition-transform duration-100">
                <div
                  className="bg-white border-2 border-[#d4d4d4] h-[460px] w-[680px] rounded-[14px] shadow flex items-center justify-center p-[32px] relative overflow-hidden"
                  onClick={e => e.stopPropagation()}
                >
                  {/* Always show floor plan image as background if available */}
                  {floorPlanUrl && (
                    <img
                      src={floorPlanUrl}
                      alt="Floor plan"
                      className="absolute inset-0 w-full h-full object-contain opacity-40 pointer-events-none"
                    />
                  )}

                  {mounted && rooms.length > 0 ? (
                    <div data-overlay-root className="relative w-full h-full">
                      {rooms.map(room => (
                        <RoomOverlayBox
                          key={room.id} room={room}
                          isSelected={selectedRoomId === room.id}
                          hasSelection={!!selectedRoomId}
                          onSelect={() => setSelectedRoomId(room.id)}
                          onResize={box => handleResizeRoom(room.id, box)}
                          onSwap={targetId => handleSwapRooms(room.id, targetId)}
                        />
                      ))}
                    </div>
                  ) : loadingRooms ? (
                    <div className="flex flex-col items-center gap-2 text-gray-400 relative z-10">
                      <Loader2 size={24} className="animate-spin" />
                      <span className="text-sm">Detecting rooms…</span>
                    </div>
                  ) : !floorPlanUrl ? (
                    <div className="flex flex-col items-center gap-2 text-gray-300 select-none relative z-10">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect width="18" height="18" x="3" y="3" rx="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                      </svg>
                      <span className="text-sm font-medium">No Floor Plan Uploaded</span>
                    </div>
                  ) : (
                    // Floor plan uploaded but no rooms detected
                    <div className="flex flex-col items-center gap-2 text-gray-400 select-none relative z-10">
                      <span className="text-sm font-medium">Floor plan loaded</span>
                      <span className="text-xs text-gray-300">Room detection complete</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 3D View */}
          {viewMode === "3d" && (
            <div className="flex-1 overflow-hidden" onClick={() => setSelectedFurnitureId(null)}>
              {mounted && (
                <ThreeScene
                  floorPlanUrl={floorPlanUrl || null}
                  roomWidthCm={roomDimensionsCm.width}
                  roomDepthCm={roomDimensionsCm.depth}
                  rooms={rooms}
                  buildingPerimeter={buildingPerimeter}
                  openings={openings}
                  furniture={placedFurniture}
                  onFurnitureMove={handleFurnitureMove}
                  onFurnitureSelect={setSelectedFurnitureId}
                  selectedFurnitureId={selectedFurnitureId}
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
            <>
              {viewMode === "3d" && (
                <div className="mx-3 mb-2 bg-[#f0f7f6] border border-[#c7de7d] rounded-[10px] px-3 py-2">
                  <p className="text-[11px] text-[#004643] font-medium">Drag items into the 3D scene →</p>
                </div>
              )}
              <div className="px-3 pb-2">
                <div className="flex items-center gap-2 bg-[#f5f5f5] rounded-[8px] px-3 h-[34px]">
                  <Search className="w-[13px] h-[13px] text-[#a3a3a3] shrink-0" />
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search furniture…" className="flex-1 bg-transparent text-[12px] placeholder:text-[#a3a3a3] focus:outline-none" />
                </div>
              </div>
              <div className="px-3 pb-2">
                <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
                  {["All", ...FURNITURE_CATALOGUE.map(c => c.category)].map(chip => (
                    <button key={chip} onClick={() => setActiveFilterChip(chip)} className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all shrink-0 ${activeFilterChip === chip ? "bg-[#003832] text-white" : "bg-[#f5f5f5] text-[#737373] hover:text-[#0a0a0a]"}`}>{chip}</button>
                  ))}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-hide px-3 pb-4">
                {filteredCatalogue.map(cat => (
                  <div key={cat.category} className="mb-4">
                    <p className="text-[11px] font-bold text-[#a3a3a3] uppercase tracking-[0.05em] pt-2 pb-1.5">{cat.category}</p>
                    <div className="grid grid-cols-2 gap-[8px]">
                      {cat.items.map(item => (
                        <div
                          key={item.id}
                          draggable={viewMode === "3d"}
                          onDragStart={e => handleDragStart(e, item)}
                          className={`flex flex-col bg-white border border-[#e5e5e5] rounded-[12px] overflow-hidden transition-all group ${viewMode === "3d" ? "cursor-grab active:cursor-grabbing hover:border-[#003832] hover:shadow-sm" : "opacity-60"}`}
                        >
                          <div className="w-full h-[52px] flex items-center justify-center" style={{ backgroundColor: item.color + "22" }}>
                            <div className="w-8 h-8 rounded-[6px] border border-black/10" style={{ backgroundColor: item.color }} />
                          </div>
                          <div className="p-2">
                            <p className="text-[11px] font-bold text-[#171717] truncate group-hover:text-[#003832] transition-colors">{item.name}</p>
                            <p className="text-[10px] text-[#a3a3a3] mt-0.5">{item.width}×{item.depth} cm</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {viewMode === "2d" && (
                  <div className="flex flex-col items-center py-6 gap-2 text-center">
                    <p className="text-[11px] text-[#a3a3a3]">Switch to 3D view to place furniture</p>
                    <button onClick={() => setViewMode("3d")} className="px-4 py-2 bg-[#003832] text-white text-[11px] font-medium rounded-full hover:bg-[#004643] transition-colors">Switch to 3D →</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto scrollbar-hide px-3 py-4">
              {selectedFurniture ? (
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-[13px] font-semibold text-[#0a0a0a] mb-1">{selectedFurniture.name}</p>
                    <p className="text-[11px] text-[#737373]">{selectedFurniture.width} × {selectedFurniture.depth} × {selectedFurniture.height} cm</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[#737373] uppercase tracking-[0.05em] mb-2">Color</p>
                    <div className="grid grid-cols-4 gap-2">
                      {EDIT_COLORS.map(color => (
                        <button
                          key={color}
                          onClick={() => setColor(color)}
                          className={`aspect-square rounded-[8px] border-2 transition-all hover:scale-105 ${selectedFurniture.color === color ? "border-[#003832]" : "border-transparent"}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleRotate} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#f5f5f5] rounded-[10px] text-[12px] font-medium text-[#525252] hover:bg-[#e8e8e8] transition-colors">
                      <RotateCw size={13} />Rotate 45°
                    </button>
                    <button onClick={handleDelete} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#fef2f2] rounded-[10px] text-[12px] font-medium text-[#ef4444] hover:bg-[#fee2e2] transition-colors">
                      <Trash2 size={13} />Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-center py-10">
                  <Sofa size={28} className="text-[#d4d4d4]" />
                  <p className="text-[12px] font-semibold text-[#525252]">No item selected</p>
                  <p className="text-[11px] text-[#a3a3a3]">Click a furniture item in the 3D scene to edit it</p>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar{display:none}
        .scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}
      `}</style>
    </div>
  );
}