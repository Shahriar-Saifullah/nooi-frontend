"use client";

import { useState } from "react";
import {
  Search,
  Minus,
  Plus,
  RotateCcw,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterHorizontal,
  AlignEndVertical,
  LayoutGrid,
  Sofa,
  Flower2,
  Layers2,
  Copy,
  Settings2,
} from "lucide-react";
import { useEffect } from "react";
import { useProjectStore } from "@/lib/store";

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

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function FurnitureIcon({ type, size = 36 }: { type: string; size?: number }) {
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

// ─── Main Canvas Page ─────────────────────────────────────────────────────────

export default function CanvasPage() {
  const [activeTab, setActiveTab] = useState<"assets" | "layers">("assets");
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [zoom, setZoom] = useState(100);
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const { currentProject } = useProjectStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      console.log("Canvas mounted. Current Project:", currentProject);
    }
  }, [mounted, currentProject]);

  const filteredElements = ELEMENTS.map((cat) => ({
    ...cat,
    items: cat.items.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((cat) => cat.items.length > 0);

  return (
    <div className="flex h-screen w-screen bg-[#f5f5f5] overflow-hidden font-sans select-none">

      {/* ── Left Panel: Elements Library ── */}
      <aside className="w-[220px] shrink-0 bg-white border-r border-[#e8eceb] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-[#f0f2f1]">
          <h2 className="text-[14px] font-semibold text-[#101212] mb-3">Elements Library</h2>

          {/* Search */}
          <div className="flex items-center gap-2 bg-white border border-[#e2e8e7] rounded-[8px] px-3 h-[34px]">
            <Search className="w-[13px] h-[13px] text-[#adb5b4] shrink-0" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search elements..."
              className="flex-1 bg-transparent text-[12px] text-[#101212] placeholder:text-[#adb5b4] focus:outline-none"
            />
          </div>

          {/* Assets / Layers tabs */}
          <div className="flex mt-2.5 bg-[#f0f2f1] rounded-[8px] p-[3px]">
            {(["assets", "layers"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 text-[12px] font-medium py-[5px] rounded-[6px] transition-all ${
                  activeTab === tab
                    ? "bg-white text-[#101212] shadow-sm"
                    : "text-[#8e9493] hover:text-[#101212]"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* 3 small icon category buttons */}
        <div className="flex items-center gap-[6px] px-4 py-3 border-b border-[#f0f2f1]">
          {[
            <Sofa size={16} />,
            <Flower2 size={16} />,
            <LayoutGrid size={16} />,
          ].map((icon, i) => (
            <button
              key={i}
              className={`flex-1 h-[30px] flex items-center justify-center rounded-[6px] border transition-colors ${
                i === 0
                  ? "border-[#004643] text-[#004643] bg-[#f0f7f6]"
                  : "border-[#e2e8e7] text-[#8e9493] hover:border-[#004643] hover:text-[#004643]"
              }`}
            >
              {icon}
            </button>
          ))}
        </div>

        {/* Category list */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {filteredElements.map((cat) => (
            <div key={cat.name}>
              {/* Category header */}
              <p className="px-4 pt-4 pb-2 text-[13px] font-semibold text-[#101212]">
                {cat.name}
              </p>
              {/* Items grid */}
              <div className="grid grid-cols-2 gap-[8px] px-4 pb-3">
                {cat.items.map((item) => (
                  <button
                    key={item.id}
                    draggable
                    className="flex flex-col items-center gap-[6px] group"
                  >
                    {/* Icon card */}
                    <div className="w-full aspect-square border border-[#e2e8e7] rounded-[8px] bg-white flex items-center justify-center text-[#555] group-hover:border-[#004643] group-hover:text-[#004643] group-hover:bg-[#f0f7f6] transition-all">
                      <FurnitureIcon type={item.icon} size={20} />
                    </div>
                    {/* Label */}
                    <span className="text-[11px] text-[#555] text-center leading-tight group-hover:text-[#101212] transition-colors">
                      {item.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="h-4" />
        </div>
      </aside>


      {/* ── Center: Canvas ── */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top bar */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-white border border-[#e8eceb] rounded-full px-1 py-1 shadow-sm">
          {(["2d", "3d"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-5 py-2 rounded-full text-[13px] font-semibold transition-all ${
                viewMode === mode
                  ? "bg-[#004643] text-white"
                  : "text-[#8e9493] hover:text-[#101212]"
              }`}
            >
              {mode === "2d" ? "2D Floor Plan" : "3D Walkthrough"}
            </button>
          ))}
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
          className="flex-1 overflow-hidden relative"
          style={{
            backgroundImage: `
              linear-gradient(to right, #e0e4e3 1px, transparent 1px),
              linear-gradient(to bottom, #e0e4e3 1px, transparent 1px)
            `,
            backgroundSize: `${zoom * 0.4}px ${zoom * 0.4}px`,
            backgroundPosition: "center center",
          }}
        >
          {mounted && currentProject?.floorPlanUrl && (
            <div 
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{
                transform: `scale(${zoom / 100})`,
                transition: "transform 0.1s ease-out",
                zIndex: 1
              }}
            >
              <img 
                src={currentProject.floorPlanUrl} 
                alt="Floor Plan" 
                className="max-w-[90%] max-h-[90%] opacity-60 shadow-2xl rounded-lg border-2 border-dashed border-[#004643]/20"
                onLoad={() => console.log("Floor plan image loaded successfully:", currentProject.floorPlanUrl)}
                onError={(e) => console.error("Failed to load floor plan image:", currentProject.floorPlanUrl, e)}
              />
            </div>
          )}
        </div>
      </main>

      {/* ── Right Panel: Edit Panel ── */}
      <aside className="w-[300px] shrink-0 bg-white border-l border-[#e8eceb] flex flex-col overflow-hidden overflow-y-auto scrollbar-hide">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-[#f0f2f1]">
          <h2 className="text-[15px] font-semibold text-[#101212]">Edit Panel</h2>
        </div>

        {/* Top action icons */}
        <div className="px-4 py-4 border-b border-[#f0f2f1]">
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[<Settings2 size={16} />, <Layers2 size={16} />, <Copy size={16} />].map((icon, i) => (
              <button
                key={i}
                className="h-[36px] flex items-center justify-center rounded-[8px] border border-[#e8eceb] text-[#8e9493] hover:border-[#004643] hover:text-[#004643] transition-colors"
              >
                {icon}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              <AlignLeft size={16} />,
              <AlignCenter size={16} />,
              <AlignRight size={16} />,
              <AlignStartVertical size={16} />,
              <AlignCenterHorizontal size={16} />,
              <AlignEndVertical size={16} />,
            ].map((icon, i) => (
              <button
                key={i}
                className="h-[36px] flex items-center justify-center rounded-[8px] border border-[#e8eceb] text-[#8e9493] hover:border-[#004643] hover:text-[#004643] transition-colors"
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* Position/Size inputs */}
        <div className="px-4 py-4 border-b border-[#f0f2f1] flex flex-col gap-3">
          {[
            { label: "X", value: "120", label2: "Y", value2: "350" },
            { label: "W", value: "240", label2: "H", value2: "85" },
            { label: "°", value: "0", label2: "Z", value2: "0" },
          ].map((row, i) => (
            <div key={i} className="grid grid-cols-2 gap-2">
              {[
                { l: row.label, v: row.value },
                { l: row.label2, v: row.value2 },
              ].map(({ l, v }) => (
                <div key={l} className="flex items-center gap-2 border border-[#e8eceb] rounded-[8px] h-[34px] px-3">
                  <span className="text-[12px] text-[#8e9493] font-medium w-4 shrink-0">{l}</span>
                  <input
                    defaultValue={v}
                    className="flex-1 text-[13px] text-[#101212] font-medium bg-transparent focus:outline-none text-right"
                  />
                </div>
              ))}
            </div>
          ))}
          <label className="flex items-center gap-2 cursor-pointer">
            <div className="w-4 h-4 rounded border border-[#004643] bg-[#004643] flex items-center justify-center shrink-0">
              <svg viewBox="0 0 10 10" className="w-2.5 h-2.5"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
            </div>
            <span className="text-[13px] text-[#444]">Constrain proportions</span>
          </label>
        </div>

        {/* Layers section */}
        <div className="px-5 py-4 border-b border-[#f0f2f1] flex flex-col">
          <h3 className="text-[14px] font-semibold text-[#101212] mb-1">Layers</h3>
          <p className="text-[12px] text-[#8e9493] mb-5">Manage all elements in your design</p>
          {/* Empty state */}
          <div className="flex flex-col items-center justify-center gap-3 py-8">
            <svg width="52" height="52" viewBox="0 0 40 40" fill="none">
              <rect x="8" y="16" width="24" height="4" rx="2" fill="#e0e4e3"/>
              <rect x="8" y="22" width="24" height="4" rx="2" fill="#eaedec"/>
              <rect x="8" y="10" width="24" height="4" rx="2" fill="#d4d9d8"/>
            </svg>
            <p className="text-[13px] font-medium text-[#101212]">No elements yet</p>
            <p className="text-[12px] text-[#8e9493] text-center">Add items from the left panel</p>
          </div>
        </div>

        {/* Layer actions */}
        <div className="px-5 py-4 border-b border-[#f0f2f1]">
          <h3 className="text-[14px] font-semibold text-[#101212] mb-3">Layer Actions</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] text-[#444]">
            {["Bring Forward", "Send Backward", "To Front", "To Back"].map((action) => (
              <button
                key={action}
                className="text-left hover:text-[#004643] transition-colors py-0.5"
              >
                {action}
              </button>
            ))}
          </div>
        </div>

        {/* Materials section */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[12px] font-bold text-[#8e9493] tracking-[0.07em] uppercase">Materials</h3>
            <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#f5f7f6] text-[#8e9493] hover:text-[#101212] transition-colors">
              <Plus size={14} />
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {[
              { color: "#d4cfc9", name: "Fabric · Grey Linen", pct: "100%" },
              { color: "#3d2b1f", name: "Wood · Dark Walnut", pct: "100%" },
            ].map((mat) => (
              <div key={mat.name} className="flex items-center gap-3">
                <div
                  className="w-5 h-5 rounded-md shrink-0 border border-black/10"
                  style={{ backgroundColor: mat.color }}
                />
                <span className="flex-1 text-[13px] text-[#444] truncate">{mat.name}</span>
                <span className="text-[12px] text-[#8e9493]">{mat.pct}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
