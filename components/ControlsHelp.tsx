"use client";

/**
 * Camera controls help — a small "?" button in the 3D toolbar. Hover (or
 * focus) shows how to move around; a click keeps it open until clicked again
 * or dismissed. Replaces the always-on hint strip, which sat on top of the
 * Doors & windows and Kitchen buttons.
 */

import React, { useEffect, useRef, useState } from "react";
import { HelpCircle, MousePointer2, ZoomIn, Hand, Keyboard, ArrowUpDown, Sparkles } from "lucide-react";

type Mode = "orbit" | "inside" | "rendered";

const HINTS: Record<Mode, { icon: React.ReactNode; text: string }[]> = {
  orbit: [
    { icon: <MousePointer2 size={13} />, text: "Drag to orbit" },
    { icon: <ZoomIn size={13} />, text: "Scroll to zoom" },
    { icon: <Hand size={13} />, text: "Right-click and drag to pan" },
    { icon: <Keyboard size={13} />, text: "WASD / arrow keys to shift the camera" },
  ],
  inside: [
    { icon: <MousePointer2 size={13} />, text: "Drag to look around" },
    { icon: <ZoomIn size={13} />, text: "Scroll to fly forward and back" },
    { icon: <Keyboard size={13} />, text: "WASD to walk" },
    { icon: <ArrowUpDown size={13} />, text: "Q / E or Shift / Space to go down / up" },
  ],
  rendered: [
    { icon: <Sparkles size={13} />, text: "Rendered view — move as usual" },
    { icon: <MousePointer2 size={13} />, text: "It sharpens again when you stop" },
  ],
};

export default function ControlsHelp({ mode }: { mode: Mode }) {
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const open = hover || pinned;

  // a click anywhere else closes a pinned panel
  useEffect(() => {
    if (!pinned) return;
    const away = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setPinned(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setPinned(false); };
    window.addEventListener("pointerdown", away);
    window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("pointerdown", away); window.removeEventListener("keydown", esc); };
  }, [pinned]);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        type="button"
        onClick={() => setPinned(p => !p)}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
        aria-label="How to move around the 3D view"
        aria-expanded={open}
        className={`flex h-[29px] w-[29px] items-center justify-center rounded-full backdrop-blur-sm transition-colors ${
          pinned ? "bg-white text-[#0a0a0a]" : "bg-black/50 text-white/80 hover:text-white"
        }`}
      >
        <HelpCircle size={15} />
      </button>
      {open && (
        <div
          role="tooltip"
          className="absolute bottom-full left-0 mb-2 w-[244px] rounded-[12px] bg-black/75 p-3 text-white shadow-lg backdrop-blur-sm"
        >
          <div className="mb-2 text-[11.5px] font-semibold">
            {mode === "inside" ? "Walking inside" : mode === "rendered" ? "Rendered view" : "Moving around"}
          </div>
          <ul className="space-y-1.5">
            {HINTS[mode].map(h => (
              <li key={h.text} className="flex items-center gap-2 text-[11px] text-white/80">
                <span className="text-white/60">{h.icon}</span>{h.text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
