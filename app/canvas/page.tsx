"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Search,
  Minus,
  Plus,
  RotateCcw,
  Sofa,
  Sun,
  Layers,
  Sparkles,
  ChevronDown,
  Settings2,
  LayoutGrid,
  ChevronLeft,
  Share2,
  Download,
  Palette,
  ChevronRight,
  SlidersHorizontal,
  X,
} from "lucide-react";
import CanvasPromptBox from "@/components/CanvasPromptBox";
import { useProjectStore } from "@/lib/store";
import { getProject } from "@/lib/api/projects";
import {
  RoomOverlayBox,
  relayoutGrid,
  type GridRoom,
} from "@/components/RoomLayoutGrid";

// ─── Types ───────────────────────────────────────────────────────────────────

type ElementItem = { id: string; name: string; icon: string };
type Category = { name: string; items: ElementItem[] };

// ─── Element Library Data ────────────────────────────────────────────────────

const ELEMENTS: Category[] = [
  {
    name: "Living Room",
    items: [
      { id: "sofa", name: "Sofa", icon: "sofa" },
      { id: "armchair", name: "Armchair", icon: "armchair" },
      { id: "tv-stand", name: "TV Stand", icon: "tv" },
      { id: "coffee-table", name: "Coffee Table", icon: "table" },
      { id: "side-table", name: "Side Table", icon: "side-table" },
    ],
  },
  {
    name: "Bedroom",
    items: [
      { id: "queen-bed", name: "Queen Bed", icon: "bed" },
      { id: "king-bed", name: "King Bed", icon: "bed" },
      { id: "nightstand", name: "Nightstand", icon: "nightstand" },
      { id: "dresser", name: "Dresser", icon: "dresser" },
      { id: "wardrobe", name: "Wardrobe", icon: "wardrobe" },
    ],
  },
  {
    name: "Dining",
    items: [
      { id: "dining-4", name: "Dining Table (4)", icon: "dining" },
      { id: "dining-6", name: "Dining Table (6)", icon: "dining" },
      { id: "dining-chair", name: "Dining Chair", icon: "chair" },
      { id: "bar-stool", name: "Bar Stool", icon: "stool" },
    ],
  },
  {
    name: "Office",
    items: [
      { id: "desk", name: "Desk", icon: "desk" },
      { id: "l-desk", name: "L-Shaped Desk", icon: "desk" },
      { id: "office-chair", name: "Office Chair", icon: "chair" },
      { id: "bookshelf", name: "Bookshelf", icon: "bookshelf" },
      { id: "filing-cabinet", name: "Filing Cabinet", icon: "cabinet" },
    ],
  },
  {
    name: "Bathroom",
    items: [
      { id: "bathtub", name: "Bathtub", icon: "bath" },
      { id: "shower", name: "Shower", icon: "shower" },
      { id: "sink", name: "Sink", icon: "sink" },
      { id: "toilet", name: "Toilet", icon: "toilet" },
      { id: "vanity", name: "Vanity", icon: "vanity" },
    ],
  },
  {
    name: "Decor",
    items: [
      { id: "small-plant", name: "Small Plant", icon: "plant" },
      { id: "large-plant", name: "Large Plant", icon: "plant" },
      { id: "floor-lamp", name: "Floor Lamp", icon: "lamp" },
      { id: "table-lamp", name: "Table Lamp", icon: "lamp" },
      { id: "rug", name: "Rug", icon: "rug" },
    ],
  },
];

// ─── Color palette from Figma ─────────────────────────────────────────────────

const PALETTE_COLORS = [
  "#f5f0e8",
  "#3d5a4c",
  "#8a8a8a",
  "#1a6b63",
  "#2e8b7a",
  "#e8c840",
];

// ─── Suggestion chips from Figma ──────────────────────────────────────────────

const SUGGESTION_CHIPS = [
  "Cozy Scandinavian living room",
  "Maximise natural light",
  "Add plants for biophilic design",
  "Modern minimalist bedroom",
];

// ─── Furniture Library Data from Figma ────────────────────────────────────────

const LIBRARY_SECTIONS = [
  {
    name: "Living Room",
    count: "24 items",
    items: [
      { name: "L-Shaped Sofa", size: "240 × 160 cm", img: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=300&q=80" },
      { name: "Armchair", size: "85 × 80 cm", img: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=300&q=80" },
      { name: "Coffee Table", size: "Ø 100 cm", img: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=300&q=80" },
      { name: "TV Stand", size: "180 × 45 cm", img: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=300&q=80" },
      { name: "Bookshelf", size: "120 × 30 cm", img: "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=300&q=80" },
      { name: "Floor Lamp", size: "Ø 40 cm", img: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=300&q=80" },
    ]
  },
  {
    name: "Dining",
    count: "16 items",
    items: [
      { name: "Dining Table", size: "200 × 100 cm", img: "https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&w=300&q=80" },
      { name: "Dining Chair", size: "45 × 50 cm", img: "https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=300&q=80" },
      { name: "Bar Stool", size: "Ø 40 cm", img: "https://images.unsplash.com/photo-1592078615290-033ee584e267?auto=format&fit=crop&w=300&q=80" },
      { name: "Sideboard", size: "160 × 45 cm", img: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=300&q=80" },
    ]
  },
  {
    name: "Bedroom",
    count: "18 items",
    items: []
  }
];

// ─── SVG Icons ---────────────────────────────────────────────────────────────────

function FurnitureIcon({ type, size = 24 }: { type: string; size?: number }) {
  const s = size;
  const c = { width: s, height: s, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (type) {
    case "sofa": case "armchair":
      return <svg {...c}><rect x="2" y="9" width="20" height="10" rx="2"/><rect x="1" y="11" width="4" height="6" rx="1"/><rect x="19" y="11" width="4" height="6" rx="1"/><path d="M6 19v2M18 19v2"/></svg>;
    case "tv":
      return <svg {...c}><rect x="2" y="5" width="20" height="13" rx="2"/><path d="M8 21h8M12 18v3"/></svg>;
    case "table": case "side-table":
      return <svg {...c}><rect x="3" y="8" width="18" height="3" rx="1"/><path d="M5 11v5M19 11v5"/></svg>;
    case "bed":
      return <svg {...c}><rect x="2" y="8" width="20" height="13" rx="2"/><path d="M2 14h20M7 8V5a1 1 0 011-1h8a1 1 0 011 1v3"/></svg>;
    case "nightstand": case "dresser": case "wardrobe": case "cabinet": case "bookshelf":
      return <svg {...c}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M12 3v18"/></svg>;
    case "dining":
      return <svg {...c}><rect x="5" y="5" width="14" height="14" rx="2"/><circle cx="12" cy="12" r="3"/></svg>;
    case "chair": case "stool":
      return <svg {...c}><rect x="6" y="10" width="12" height="8" rx="1"/><path d="M6 10V6a2 2 0 014 0v4M14 10V6a2 2 0 014 0v4M6 18v3M18 18v3"/></svg>;
    case "desk":
      return <svg {...c}><rect x="2" y="10" width="20" height="4" rx="1"/><path d="M4 14v6M20 14v6"/></svg>;
    case "bath":
      return <svg {...c}><path d="M3 9h18v5a7 7 0 01-14 0V9zM7 9V5a2 2 0 014 0"/></svg>;
    case "shower":
      return <svg {...c}><path d="M4 4h4v4H4zM12 4h8v16H4V8h8"/><circle cx="8" cy="8" r="1" fill="currentColor"/></svg>;
    case "sink":
      return <svg {...c}><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M10 8V5M14 8V5"/></svg>;
    case "toilet":
      return <svg {...c}><rect x="5" y="3" width="14" height="5" rx="1"/><ellipse cx="12" cy="16" rx="7" ry="5"/></svg>;
    case "vanity":
      return <svg {...c}><rect x="2" y="10" width="20" height="11" rx="1"/><path d="M2 14h20M12 10V4M9 7h6"/></svg>;
    case "plant":
      return <svg {...c}><path d="M12 21v-8"/><path d="M12 13C9 10 5 11 5 11s0 4 7 2"/><path d="M12 13c3-3 7-2 7-2s0 4-7 2"/><ellipse cx="12" cy="8" rx="4" ry="5"/></svg>;
    case "lamp":
      return <svg {...c}><path d="M12 2l-5 9h10L12 2z"/><rect x="10" y="11" width="4" height="7"/><path d="M9 18h6"/></svg>;
    case "rug":
      return <svg {...c}><rect x="3" y="6" width="18" height="12" rx="2"/><rect x="6" y="9" width="12" height="6" rx="1"/></svg>;
    default:
      return <svg {...c}><rect x="3" y="3" width="18" height="18" rx="2"/></svg>;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// API rooms always have color as optional — give every room a fallback so the
// grid never renders an unstyled/invisible block.
const FALLBACK_COLORS = ["#c3f4f0", "#b9eac5", "#87ddd7", "#f7dfad", "#d5dbda", "#ffc9c0"];

function toGridRoom(room: any, index: number): GridRoom {
  return {
    id:        room.id,
    name:      room.name,
    color:     room.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length],
    box:       room.box,
    gridRow:   room.gridRow,
    gridCol:   room.gridCol,
    rowWeight: room.rowWeight,
    colWeight: room.colWeight,
  };
}

// ─── Main Canvas Page ─────────────────────────────────────────────────────────

export default function CanvasPage() {
  const router = useRouter();
  const [rightTab, setRightTab] = useState<"elements" | "edit">("elements");
  const [activeSubTab, setActiveSubTab] = useState<"assets" | "layers">("assets");
  const [activeCategoryIcon, setActiveCategoryIcon] = useState(0);
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [zoom, setZoom] = useState(100);
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const { currentProject, setProjectRooms } = useProjectStore();
  const [activeEditSubTab, setActiveEditSubTab] = useState<"settings" | "layers" | "palette">("layers");
  const [showLibrary, setShowLibrary] = useState(false);
  const [librarySearchQuery, setLibrarySearchQuery] = useState("");
  const [activeFilterChip, setActiveFilterChip] = useState("All");

  // ── Room layout state (replaces the static floor plan image) ──
  const [rooms, setRooms] = useState<GridRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [loadingRooms, setLoadingRooms] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      console.log("Canvas mounted. Current Project:", currentProject);
    }
  }, [mounted, currentProject]);

  // Load the room layout: prefer the store (set right after project creation,
  // no network wait), fall back to fetching the project fresh — covers a
  // direct page refresh or opening a saved project from the dashboard.
  useEffect(() => {
    if (!mounted) return;

    if (currentProject?.rooms && currentProject.rooms.length > 0) {
      setRooms(currentProject.rooms.map(toGridRoom).filter(r => r.box));
      return;
    }

    if (currentProject?.id) {
      setLoadingRooms(true);
      getProject(currentProject.id)
        .then((project) => {
          const apiRooms = project.room_data?.rooms ?? [];
          const gridRooms = apiRooms.map(toGridRoom).filter(r => r.box);
          setRooms(gridRooms);
          if (apiRooms.length > 0) setProjectRooms(apiRooms);
        })
        .catch((err) => {
          console.error("Failed to load project rooms:", err);
        })
        .finally(() => setLoadingRooms(false));
    }
  }, [mounted, currentProject?.id]);

  const handleResizeRoom = (id: string, box: GridRoom["box"]) => {
    if (!box) return;
    const target = rooms.find(r => r.id === id);
    if (!target || target.gridRow === undefined) return;

    const updated = rooms.map(r =>
      r.id === id ? { ...r, rowWeight: box.height, colWeight: box.width } : r
    );
    setRooms(relayoutGrid(updated));
  };

  const handleSwapRooms = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    const dragged = rooms.find(r => r.id === draggedId);
    const target  = rooms.find(r => r.id === targetId);
    if (!dragged || !target || dragged.gridRow === undefined || target.gridRow === undefined) return;

    const updated = rooms.map(r => {
      if (r.id === draggedId) {
        return { ...r, gridRow: target.gridRow, gridCol: target.gridCol, rowWeight: target.rowWeight, colWeight: target.colWeight };
      }
      if (r.id === targetId) {
        return { ...r, gridRow: dragged.gridRow, gridCol: dragged.gridCol, rowWeight: dragged.rowWeight, colWeight: dragged.colWeight };
      }
      return r;
    });
    setRooms(relayoutGrid(updated));
  };

  const filteredElements = ELEMENTS.map((cat) => ({
    ...cat,
    items: cat.items.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((cat) => cat.items.length > 0);

  return (
    <div className="flex flex-col h-screen w-full bg-[#f5f5f5] overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* ── Navbar ── */}
      <header className="h-[56px] border-b border-[#e5e5e5] bg-white flex items-center justify-between px-4 shrink-0">
        {/* Left container */}
        <div className="flex items-center gap-3">
          {/* Dashboard Return Button */}
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-1 px-2 py-1.5 hover:bg-[#fafafa] rounded-full transition-colors text-[12px] font-medium text-[#525252]"
          >
            <ChevronLeft size={16} className="text-[#525252]" />
            Dashboard
          </button>
          
          {/* Vertical divider */}
          <div className="h-5 w-px bg-[#e5e5e5]" />
          
          {/* Project Type Icon Wrapper (Nooi light green badge icon) */}
          <div className="w-7 h-7 bg-[#c7de7d] rounded-[10px] flex items-center justify-center shrink-0">
            {/* Grid icon representation for floor plan */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#003832" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
            </svg>
          </div>
          
          {/* Project Title and type */}
          <div className="flex items-baseline gap-1">
            <span className="text-[14px] font-semibold text-[#0a0a0a] tracking-tight">
              {currentProject?.name || "Untitled Project"}
            </span>
            <span className="text-[12px] text-[#737373]">
              — Floor plan
            </span>
          </div>
        </div>

        {/* Right container */}
        <div className="flex items-center gap-2">
          {/* Share button */}
          <button className="flex items-center gap-1.5 px-3 py-1.5 border border-[#e5e5e5] rounded-full hover:bg-gray-50 transition-all text-[12px] font-medium text-[#525252]">
            <Share2 size={14} className="text-[#525252]" />
            Share
          </button>
          
          {/* Export button */}
          <button className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#004643] rounded-full hover:bg-[#003633] transition-all text-[12px] font-medium text-white shadow-[0_1px_3px_rgba(0,70,67,0.15)]">
            <Download size={14} className="text-white" />
            Export
          </button>
        </div>
      </header>

      {/* Main layout container wrapping panels */}
      <div className="flex flex-row flex-1 overflow-hidden p-3 gap-3 bg-[#f5f5f5] min-w-0">

      {/* ══════════════════════════════════════════════════════════════════════
          LEFT PANEL: AI Design Assistant
          ══════════════════════════════════════════════════════════════════════ */}
      <aside
        className="shrink-0 bg-white flex flex-col overflow-visible rounded-[16px] border border-[#e5e5e5] shadow-[0_12px_24px_-4px_rgba(0,0,0,0.06),0_4px_12px_-2px_rgba(0,0,0,0.04)]"
        style={{ width: 280 }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div className="flex items-center gap-2.5">
            {/* Nooi green logo circle */}
            <div className="w-[26px] h-[26px] rounded-full bg-[#003832] flex items-center justify-center shrink-0">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="4" stroke="white" strokeWidth="1.2"/>
                <circle cx="6" cy="6" r="1.5" fill="white"/>
              </svg>
            </div>
            <span className="text-[13px] font-semibold text-[#0a0a0a] tracking-[-0.01em]">
              AI Design Assistant
            </span>
          </div>
          {/* Collapse icon */}
          <button className="w-6 h-6 flex items-center justify-center text-[#a3a3a3] hover:text-[#525252] transition-colors rounded">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
              <rect x="1" y="1" width="12" height="12" rx="2"/>
              <path d="M5 1v12"/>
            </svg>
          </button>
        </div>

        {/* ── Chat bubble ── */}
        <div className="px-4 pb-4">
          <div className="bg-[#f5f5f5] rounded-[10px] px-3.5 py-3">
            <p className="text-[12px] leading-[1.55] text-[#404040]">
              Hi! I&apos;m your Nooi design assistant. Describe the room or style you want and I&apos;ll lay it out for you.
            </p>
          </div>
        </div>

        {/* ── Spacer (chat area) ── */}
        <div className="flex-1" />

        {/* ── DESIGN SETTINGS ── */}
        <div className="px-4 pb-3">
          <p className="text-[10px] font-semibold text-[#737373] tracking-[0.06em] uppercase mb-3">
            Design Settings
          </p>

          {/* Two dropdowns side by side */}
          <div className="flex gap-2 mb-3">
            <div className="flex-1 h-[30px] border border-[#e5e5e5] rounded-[8px] flex items-center justify-between px-2.5 cursor-pointer hover:border-[#d4d4d4] transition-colors">
              <span className="text-[11px] text-[#a3a3a3]"></span>
              <ChevronDown size={11} className="text-[#a3a3a3]" />
            </div>
            <div className="flex-1 h-[30px] border border-[#e5e5e5] rounded-[8px] flex items-center justify-between px-2.5 cursor-pointer hover:border-[#d4d4d4] transition-colors">
              <span className="text-[11px] text-[#a3a3a3]"></span>
              <ChevronDown size={11} className="text-[#a3a3a3]" />
            </div>
          </div>

          {/* Palette row */}
          <div className="flex items-center gap-1 mb-4">
            <span className="text-[10px] text-[#a3a3a3] mr-1">Palette:</span>
            {PALETTE_COLORS.map((color, i) => (
              <button
                key={i}
                className="w-[16px] h-[16px] rounded-full border border-black/8 shrink-0 hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
              />
            ))}
            <button className="w-[16px] h-[16px] rounded-full border border-dashed border-[#d4d4d4] flex items-center justify-center text-[#a3a3a3] hover:border-[#737373] hover:text-[#737373] transition-colors shrink-0">
              <Plus size={8} />
            </button>
          </div>

          {/* Suggestion chips */}
          <div className="flex flex-col gap-[6px] mb-4">
            {SUGGESTION_CHIPS.map((chip) => (
              <button
                key={chip}
                className="flex items-center gap-1.5 text-left text-[11px] text-[#525252] hover:text-[#0a0a0a] transition-colors group"
              >
                <span className="text-[#a3a3a3] group-hover:text-[#525252] transition-colors text-[11px]">+</span>
                <span>{chip}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Prompt Input ── */}
        <CanvasPromptBox />
      </aside>


      {/* ══════════════════════════════════════════════════════════════════════
          CENTER: Canvas
          ══════════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-white border border-[#e5e5e5] rounded-[16px] shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        {/* Top bar — 2D / 3D Switcher */}
        <div className="absolute top-[18px] left-1/2 -translate-x-1/2 z-10 bg-white border border-[#e5e5e5] rounded-full p-[5px] flex items-center gap-[4px] shadow-[0px_4px_6px_rgba(0,0,0,0.05),0px_2px_4px_rgba(0,0,0,0.05)]">
          {(["2d", "3d"] as const).map((mode) => {
            const isActive = viewMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`flex items-center gap-[6px] px-[16px] py-[6px] rounded-full text-[12px] font-medium leading-[18px] transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-[#003832] text-white shadow-sm"
                    : "text-[#525252] hover:text-[#0a0a0a] hover:bg-[#f5f5f5]"
                }`}
              >
                {mode === "2d" ? (
                  <>
                    <Image
                      width={14}
                      height={14}
                      src="/Logo/floor-plan.svg"
                      alt=""
                      className={`w-[14px] h-[14px] ${isActive ? "brightness-0 invert" : ""}`}
                    />
                    <span>2D Floor Plan</span>
                  </>
                ) : (
                  <>
                    <Image
                      width={14}
                      height={14}
                      src="/Logo/3d-studio.svg"
                      alt=""
                      className={`w-[14px] h-[14px] ${isActive ? "brightness-0 invert" : ""}`}
                    />
                    <span>3D Walkthrough</span>
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* Zoom controls */}
        <div className="absolute bottom-5 right-5 z-10 flex items-center gap-1 bg-white border border-[#e8eceb] rounded-[10px] shadow-sm px-3 py-2">
          <button
            onClick={() => setZoom((z) => Math.max(25, z - 10))}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#f5f7f6] transition-colors text-[#444]"
          >
            <Minus size={15} />
          </button>
          <span className="text-[13px] font-medium text-[#101212] w-[44px] text-center">{zoom}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(200, z + 10))}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#f5f7f6] transition-colors text-[#444]"
          >
            <Plus size={15} />
          </button>
          <div className="w-px h-5 bg-[#e8eceb] mx-1" />
          <button
            onClick={() => setZoom(100)}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#f5f7f6] transition-colors text-[#444]"
            title="Reset zoom"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        {/* Grid canvas area */}
        <div
          className="flex-1 overflow-hidden relative flex items-center justify-center"
          style={{
            backgroundColor: "#f7f8f8",
            backgroundImage: `
              linear-gradient(to right, rgba(0, 0, 0, 0.04) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(0, 0, 0, 0.04) 1px, transparent 1px)
            `,
            backgroundSize: `${zoom * 0.4}px ${zoom * 0.4}px`,
            backgroundPosition: "center center",
          }}
          onClick={() => setSelectedRoomId(null)}
        >
          <div
            className="relative transition-transform duration-100 ease-out"
            style={{
              transform: `scale(${zoom / 100})`,
            }}
          >
            {/* White card container from Figma — now hosts the interactive room grid
                instead of the static uploaded floor plan image */}
            <div
              className="bg-white border-2 border-[#d4d4d4] border-solid h-[460px] w-[680px] rounded-[14px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] flex items-center justify-center p-[32px] relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {mounted && rooms.length > 0 ? (
                <div data-overlay-root className="relative w-full h-full">
                  {rooms.map((room) => (
                    <RoomOverlayBox
                      key={room.id}
                      room={room}
                      isSelected={selectedRoomId === room.id}
                      hasSelection={!!selectedRoomId}
                      onSelect={() => setSelectedRoomId(room.id)}
                      onResize={(box) => handleResizeRoom(room.id, box)}
                      onSwap={(targetId) => handleSwapRooms(room.id, targetId)}
                    />
                  ))}
                </div>
              ) : loadingRooms ? (
                <div className="text-gray-300 text-sm font-medium flex flex-col items-center gap-2 select-none">
                  <span>Loading floor plan…</span>
                </div>
              ) : (
                <div className="text-gray-300 text-sm font-medium flex flex-col items-center gap-2 select-none">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                    <circle cx="9" cy="9" r="2"/>
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                  </svg>
                  <span>No Floor Plan Uploaded</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>


      {/* ══════════════════════════════════════════════════════════════════════
          RIGHT PANEL: Elements + Edit
          ══════════════════════════════════════════════════════════════════════ */}
      <aside
        className="shrink-0 bg-white flex flex-col overflow-hidden rounded-[16px] border border-[#e5e5e5] shadow-[0_12px_24px_-4px_rgba(0,0,0,0.06),0_4px_12px_-2px_rgba(0,0,0,0.04)]"
        style={{ width: 280 }}
      >
        {/* ── Top Tabs: Elements | Edit | Grid icon ── */}
        <div className="flex items-center px-3 pt-3 pb-2 gap-2">
          <div className="flex bg-[#f5f5f5] rounded-full p-[3px] flex-1">
            <button
              onClick={() => setRightTab("elements")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-[5.5px] rounded-full text-[12px] font-medium transition-all ${
                rightTab === "elements"
                  ? "bg-white text-[#0a0a0a] shadow-sm"
                  : "text-[#737373] hover:text-[#0a0a0a]"
              }`}
            >
              <Sofa size={13} />
              <span>Elements</span>
            </button>
            <button
              onClick={() => setRightTab("edit")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-[5.5px] rounded-full text-[12px] font-medium transition-all ${
                rightTab === "edit"
                  ? "bg-white text-[#0a0a0a] shadow-sm"
                  : "text-[#737373] hover:text-[#0a0a0a]"
              }`}
            >
              <SlidersHorizontal size={13} />
              <span>Edit</span>
            </button>
          </div>
          {/* Grid/layout icon button */}
          <button className="w-[28px] h-[28px] flex items-center justify-center text-[#a3a3a3] hover:text-[#525252] transition-colors rounded">
            <LayoutGrid size={14} />
          </button>
        </div>

        {rightTab === "elements" ? (
          showLibrary ? (
            /* ── Furniture Library View ── */
            <>
              {/* ── Library Header ── */}
              <div className="flex items-center justify-between px-3 pt-1 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-[26px] h-[26px] bg-[#eaf8f4] rounded-[8px] flex items-center justify-center text-[#003832]">
                    <Sofa size={14} />
                  </div>
                  <span className="text-[13px] font-semibold text-[#0a0a0a]">Furniture Library</span>
                </div>
                <button
                  onClick={() => setShowLibrary(false)}
                  className="w-6 h-6 flex items-center justify-center text-[#a3a3a3] hover:text-[#525252] rounded transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              {/* ── Search ── */}
              <div className="px-3 pb-2">
                <div className="flex items-center gap-2 bg-[#f5f5f5] rounded-[8px] px-3 h-[34px]">
                  <Search className="w-[13px] h-[13px] text-[#a3a3a3] shrink-0" />
                  <input
                    value={librarySearchQuery}
                    onChange={(e) => setLibrarySearchQuery(e.target.value)}
                    placeholder="Search elements..."
                    className="flex-1 bg-transparent text-[12px] text-[#0a0a0a] placeholder:text-[#a3a3a3] focus:outline-none"
                  />
                </div>
              </div>

              {/* ── Filter chips ── */}
              <div className="px-3 pb-2">
                <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
                  {["All", "Seating", "Tables", "Storage", "Beds"].map((chip) => (
                    <button
                      key={chip}
                      onClick={() => setActiveFilterChip(chip)}
                      className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all shrink-0 ${
                        activeFilterChip === chip
                          ? "bg-[#003832] text-white"
                          : "bg-[#f5f5f5] text-[#737373] hover:text-[#0a0a0a]"
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Library List ── */}
              <div className="flex-1 overflow-y-auto scrollbar-hide px-3 pb-4">
                {LIBRARY_SECTIONS.map((section) => {
                  const filteredItems = section.items.filter((item) =>
                    item.name.toLowerCase().includes(librarySearchQuery.toLowerCase())
                  );
                  if (section.items.length > 0 && filteredItems.length === 0) return null;
                  
                  return (
                    <div key={section.name} className="mb-4">
                      <div className="flex items-center justify-between pt-2 pb-1.5">
                        <span className="text-[11px] font-bold text-[#a3a3a3] uppercase tracking-[0.05em]">{section.name}</span>
                        <span className="text-[11px] text-[#a3a3a3]">{section.count}</span>
                      </div>
                      
                      {section.items.length > 0 ? (
                        <div className="grid grid-cols-2 gap-[10px]">
                          {filteredItems.map((item, idx) => (
                            <button
                              key={idx}
                              className="flex flex-col text-left bg-white border border-[#e5e5e5] rounded-[14px] overflow-hidden hover:border-[#003832] transition-all group"
                            >
                              <div className="w-full aspect-[4/3] bg-[#fafafa] relative overflow-hidden">
                                <img
                                  src={item.img}
                                  alt={item.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              </div>
                              <div className="p-2 flex flex-col gap-0.5">
                                <span className="text-[11px] font-bold text-[#171717] truncate leading-tight group-hover:text-[#003832] transition-colors">{item.name}</span>
                                <span className="text-[10px] text-[#a3a3a3] font-medium leading-none">{item.size}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="h-[34px] bg-[#f5f5f5] rounded-[10px] flex items-center justify-center text-[11px] text-[#a3a3a3] border border-dashed border-[#e5e5e5]">
                          No items loaded
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              {/* ── Search ── */}
              <div className="px-3 pb-2">
                <div className="flex items-center gap-2 bg-[#f5f5f5] rounded-[8px] px-3 h-[34px]">
                  <Search className="w-[13px] h-[13px] text-[#a3a3a3] shrink-0" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search elements..."
                    className="flex-1 bg-transparent text-[12px] text-[#0a0a0a] placeholder:text-[#a3a3a3] focus:outline-none"
                  />
                </div>
              </div>

              {/* ── Assets / Layers toggle ── */}
              <div className="px-3 pb-2">
                <div className="flex bg-[#f5f5f5] rounded-[20px] p-[3px]">
                  {(["assets", "layers"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveSubTab(tab)}
                      className={`flex-1 text-[12px] font-medium py-[5px] rounded-[18px] transition-all ${
                        activeSubTab === tab
                          ? "bg-white text-[#0a0a0a] shadow-sm"
                          : "text-[#a3a3a3] hover:text-[#525252]"
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

            {/* ── Category Icon Row ── */}
            <div className="px-3 pb-2">
              <div className="flex bg-[#f5f5f5] rounded-full p-[3px]">
                {[
                  <LayoutGrid size={14} key="grid" />,
                  <Layers size={14} key="layers" />,
                  <Palette size={14} key="palette" />,
                ].map((icon, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveCategoryIcon(i)}
                    className={`flex-1 h-[28px] flex items-center justify-center rounded-full transition-all ${
                      activeCategoryIcon === i
                        ? "bg-white text-[#0a0a0a] shadow-sm"
                        : "text-[#737373] hover:text-[#0a0a0a]"
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Furniture Categories + Grid ── */}
            <div className="flex-1 overflow-y-auto scrollbar-hide px-3">
              {filteredElements.map((cat) => (
                <div key={cat.name} className="mb-4">
                  <p className="text-[12px] font-medium text-[#737373] pt-2 pb-1.5">
                    {cat.name}
                  </p>
                  <div className="grid grid-cols-2 gap-[10px] pb-1">
                    {cat.items.map((item) => (
                      <button
                        key={item.id}
                        draggable
                        onClick={() => setShowLibrary(true)}
                        className="flex flex-col items-center justify-center gap-1.5 p-3.5 bg-white border border-[#e5e5e5] rounded-[12px] hover:border-[#003832] hover:bg-[#f0f7f6] transition-all group"
                      >
                        <div className="text-[#525252] group-hover:text-[#003832] transition-colors">
                          <FurnitureIcon type={item.icon} size={18} />
                        </div>
                        <span className="text-[11px] font-medium text-[#171717] group-hover:text-[#003832] text-center leading-tight transition-colors">
                          {item.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div className="h-4" />
            </div>
          </>
          )
        ) : (
          /* ── Edit Tab Content ── */
          <>
            {/* ── Edit Sub-tab Pill ── */}
            <div className="px-3 pb-3 pt-1">
              <div className="flex bg-[#f5f5f5] rounded-full p-[3px]">
                {[
                  { id: "settings", icon: <SlidersHorizontal size={14} /> },
                  { id: "layers", icon: <Layers size={14} /> },
                  { id: "palette", icon: <Palette size={14} /> },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveEditSubTab(tab.id as any)}
                    className={`flex-1 h-[28px] flex items-center justify-center rounded-full transition-all ${
                      activeEditSubTab === tab.id
                        ? "bg-white text-[#0a0a0a] shadow-sm"
                        : "text-[#737373] hover:text-[#0a0a0a]"
                    }`}
                  >
                    {tab.icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide">
              {activeEditSubTab === "layers" ? (
                <>
                  {/* ── Alignment Row ── */}
                  <div className="flex items-center justify-between px-3 pb-4 pt-1">
                    {[
                      {
                        name: "Align Left",
                        svg: (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 2v20M8 5h12v4H8V5zm0 8h8v4H8v-4z"/>
                          </svg>
                        )
                      },
                      {
                        name: "Align Center",
                        svg: (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2v20M6 6h12v4H6V6zm2 8h8v4H8v-4z"/>
                          </svg>
                        )
                      },
                      {
                        name: "Align Right",
                        svg: (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 2v20M4 5h12v4H4V5zm4 8h8v4H8v-4z"/>
                          </svg>
                        )
                      },
                      {
                        name: "Align Top",
                        svg: (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 4h20M5 8h4v12H5V8zm8 0h4v8h-4V8z"/>
                          </svg>
                        )
                      },
                      {
                        name: "Align Middle",
                        svg: (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 12h20M5 6h4v12H5V6zm8 2h4v8h-4V8z"/>
                          </svg>
                        )
                      },
                      {
                        name: "Align Bottom",
                        svg: (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 20h20M5 4h4v12H5V4zm8 4h4v8h-4V8z"/>
                          </svg>
                        )
                      },
                    ].map((btn, idx) => (
                      <button
                        key={idx}
                        title={btn.name}
                        className="w-[32px] h-[32px] flex items-center justify-center border border-[#e5e5e5] rounded-[8px] bg-white text-[#737373] hover:text-[#0a0a0a] hover:bg-gray-50 transition-all"
                      >
                        {btn.svg}
                      </button>
                    ))}
                  </div>

                  {/* ── Coordinates Grid ── */}
                  <div className="grid grid-cols-2 gap-2 px-3 pb-3">
                    {[
                      { label: "X", value: 120 },
                      { label: "Y", value: 350 },
                      { label: "W", value: 240 },
                      { label: "H", value: 85 },
                      { label: "R", value: 0 },
                      { label: "Z", value: 0 },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center bg-[#f5f5f5] rounded-[8px] px-3 h-[34px] gap-2">
                        <span className="text-[11px] font-medium text-[#a3a3a3] uppercase w-3">{item.label}</span>
                        <input
                          type="number"
                          defaultValue={item.value}
                          className="w-full bg-transparent text-[12px] text-[#0a0a0a] focus:outline-none font-medium"
                        />
                      </div>
                    ))}
                  </div>

                  {/* ── Constrain proportions ── */}
                  <div className="flex items-center gap-2 px-3 pb-4">
                    <input
                      type="checkbox"
                      id="constrain"
                      className="w-3.5 h-3.5 border border-[#d4d4d4] rounded bg-white checked:bg-[#003832]"
                    />
                    <label htmlFor="constrain" className="text-[11px] text-[#737373] cursor-pointer">
                      Constrain proportions
                    </label>
                  </div>

                  {/* ── Layers placeholder ── */}
                  <div className="px-3 border-t border-[#e5e5e5] pt-3 pb-4">
                    <h3 className="text-[13px] font-semibold text-[#0a0a0a]">Layers</h3>
                    <p className="text-[11px] text-[#737373] mt-0.5">Manage all elements in your design</p>
                    
                    <div className="flex flex-col items-center justify-center py-8 border border-dashed border-[#e5e5e5] rounded-[12px] mt-3 bg-[#fafafa]">
                      <Layers className="text-[#d4d4d4]" size={28} />
                      <p className="text-[12px] font-semibold text-[#525252] mt-2">No elements yet</p>
                      <p className="text-[11px] text-[#a3a3a3] mt-0.5">Add items from the left panel</p>
                    </div>
                  </div>

                  {/* ── Layer Actions ── */}
                  <div className="px-3 border-t border-[#e5e5e5] pt-3 pb-4">
                    <h3 className="text-[13px] font-semibold text-[#0a0a0a] mb-2.5">Layer Actions</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {["Bring Forward", "Send Backward", "To Front", "To Back"].map((action) => (
                        <button
                          key={action}
                          className="h-[32px] border border-[#e5e5e5] rounded-[8px] bg-white text-[11px] font-medium text-[#525252] hover:bg-gray-50 hover:text-[#0a0a0a] transition-all"
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ── Materials ── */}
                  <div className="px-3 border-t border-[#e5e5e5] pt-3 pb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-[#737373] tracking-[0.05em] uppercase">Materials</span>
                      <button className="text-[#737373] hover:text-[#0a0a0a]">
                        <Plus size={14} />
                      </button>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between text-[11px] font-medium py-1">
                        <div className="flex items-center gap-2">
                          <div className="w-[18px] h-[18px] rounded bg-[#e5e5e5] border border-black/5" />
                          <span className="text-[#171717]">Fabric - Grey Linen</span>
                        </div>
                        <span className="text-[#a3a3a3]">100%</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-medium py-1">
                        <div className="flex items-center gap-2">
                          <div className="w-[18px] h-[18px] rounded bg-[#3d2f26] border border-black/5" />
                          <span className="text-[#171717]">Wood - Dark Walnut</span>
                        </div>
                        <span className="text-[#a3a3a3]">100%</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : activeEditSubTab === "palette" ? (
                <>
                  {/* ── Materials & Finishes Header ── */}
                  <div className="px-3 pb-3">
                    <h3 className="text-[13px] font-semibold text-[#0a0a0a]">Materials & Finishes</h3>
                    <p className="text-[11px] text-[#737373] mt-0.5">Apply realistic materials to your elements</p>
                  </div>

                  {/* ── Material Presets ── */}
                  <div className="px-3 pb-2">
                    <p className="text-[12px] font-semibold text-[#0a0a0a] mb-2">Material Presets</p>
                    <div className="flex flex-col gap-2">
                      {[
                        { name: "Wood - Oak", color: "#9c7b50" },
                        { name: "Wood - Walnut", color: "#613d1d" },
                        { name: "Wood - Mahogany", color: "#4d3227" },
                        { name: "Metal - Steel", color: "#7f8082" },
                        { name: "Metal - Black", color: "#2e3033" },
                        { name: "Fabric - Beige", color: "#ab8265" },
                        { name: "Fabric - Gray", color: "#a1a1a1" },
                        { name: "Ceramic - White", color: "#f7f7f7" },
                        { name: "Glass - Clear", color: "#e8f1f5" },
                        { name: "Stone - Marble", color: "#ebdcd8" },
                      ].map((preset, index) => (
                        <button
                          key={index}
                          className="flex items-center justify-between p-2 bg-white border border-[#e5e5e5] rounded-[10px] hover:border-[#003832] transition-all text-left"
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-[20px] h-[20px] rounded-[5px] border border-black/5"
                              style={{ backgroundColor: preset.color }}
                            />
                            <span className="text-[11px] font-medium text-[#171717]">{preset.name}</span>
                          </div>
                          <ChevronRight size={12} className="text-[#a3a3a3]" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ── Custom Color ── */}
                  <div className="px-3 pt-3 pb-6 border-t border-[#e5e5e5] mt-3">
                    <p className="text-[12px] font-semibold text-[#0a0a0a] mb-2">Custom Color</p>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        "#8a7156", "#5c3d24", "#4e3629", "#2d2d2d",
                        "#808080", "#a6a6a6", "#ffffff", "#eaeaea",
                        "#228b22", "#cd7f32", "#ffd700", "#87ceeb",
                      ].map((color, index) => (
                        <button
                          key={index}
                          className="aspect-square rounded-[8px] border border-black/5 hover:scale-105 transition-transform"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="px-3 py-6 text-center text-[12px] text-[#a3a3a3]">
                  Select the settings or layers sub-tab to edit properties.
                </div>
              )}
            </div>
          </>
        )}
      </aside>
      
      </div> {/* End of main layout container */}

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}