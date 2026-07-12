"use client";

import { useRef, useState } from "react";

// ── Shared types ──────────────────────────────────────────────────────────
// Minimal shape needed to render/interact with the grid. Callers (the create
// modal, the canvas page) can have additional fields on their own room types
// (dimensions, confidence, etc.) — only these fields are read here.

export interface RoomBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface GridRoom {
  id: string;
  name: string;
  color: string;
  box?: RoomBox;
  polygon?: [number, number][];
  gridRow?: number;
  gridCol?: number;
  rowWeight?: number;
  colWeight?: number;
}

export const GRID_GAP = 1.5; // gap between boxes, in %

interface GridAssignment {
  gridRow: number;
  gridCol: number;
  rowSpanWeight: number;
  colSpanWeight: number;
}

// ── Step 1: cluster raw boxes (e.g. from Gemini detection) into rows/columns ──
// Raw boxes are estimates with inconsistent edges — directly rendering them
// (or just nudging overlaps apart) produces jagged gaps and a "broken" look.
// We cluster rooms into rows based on their vertical center, then assign each
// room a row + column index. The actual pixel layout is computed separately by
// relayoutGrid() so it can be re-run after resize/swap edits.
//
// A max-columns-per-row cap prevents all rooms collapsing into one long strip
// when boxes happen to share a similar vertical band (common on simple
// single-floor plans) — rooms instead wrap into additional rows, similar to how
// a card grid reflows, so it always reads as a comfortable multi-row layout.
export function assignGridPositions(boxes: RoomBox[]): GridAssignment[] {
  if (boxes.length === 0) return [];

  const maxCols =
    boxes.length <= 2 ? boxes.length
    : boxes.length <= 6 ? 3
    : boxes.length <= 9 ? 4
    : 5;

  const withIndex = boxes.map((b, i) => ({ box: b, index: i, centerY: b.top + b.height / 2 }));
  withIndex.sort((a, b) => a.centerY - b.centerY);

  const avgHeight = boxes.reduce((s, b) => s + b.height, 0) / boxes.length;
  const rowThreshold = Math.max(avgHeight * 0.6, 8);

  const rows: typeof withIndex[] = [];
  let currentRow: typeof withIndex = [];
  let lastCenterY: number | null = null;

  for (const item of withIndex) {
    const startsNewRow =
      lastCenterY === null ||
      item.centerY - lastCenterY > rowThreshold ||
      currentRow.length >= maxCols; // hard wrap once the row is full, regardless of vertical position

    if (startsNewRow) {
      if (currentRow.length > 0) rows.push(currentRow);
      currentRow = [item];
    } else {
      currentRow.push(item);
    }
    lastCenterY = item.centerY;
  }
  if (currentRow.length > 0) rows.push(currentRow);

  rows.forEach(row => row.sort((a, b) => a.box.left - b.box.left));

  const result: GridAssignment[] = new Array(boxes.length);
  rows.forEach((row, rowIdx) => {
    row.forEach((item, colIdx) => {
      result[item.index] = {
        gridRow: rowIdx,
        gridCol: colIdx,
        rowSpanWeight: item.box.height,
        colSpanWeight: item.box.width,
      };
    });
  });

  return result;
}

// ── Step 2: compute actual pixel-percent positions from row/col + weights ──
// Re-run any time a room's weight changes (resize) or rooms swap row/col (drag-swap).
// Guarantees a clean, gapless, non-overlapping grid every time.
export function relayoutGrid<T extends GridRoom>(rooms: T[]): T[] {
  const withGrid = rooms.filter(r => r.gridRow !== undefined && r.gridCol !== undefined);
  if (withGrid.length === 0) return rooms;

  const maxRow = Math.max(...withGrid.map(r => r.gridRow!));
  const rawRowGroups: T[][] = Array.from({ length: maxRow + 1 }, () => []);
  withGrid.forEach(r => rawRowGroups[r.gridRow!].push(r));

  // Drop any empty rows (e.g. left behind after deleting the only room in a row)
  // so the layout doesn't keep a blank gap where that row used to be.
  const rowGroups = rawRowGroups.filter(row => row.length > 0);
  rowGroups.forEach(row => row.sort((a, b) => (a.gridCol ?? 0) - (b.gridCol ?? 0)));

  // Row heights — proportional to each row's max weight, with a floor so no row vanishes
  const rawRowWeights = rowGroups.map(row =>
    row.length > 0 ? Math.max(...row.map(r => r.rowWeight ?? r.box?.height ?? 1)) : 1
  );
  const maxRawRowWeight = Math.max(...rawRowWeights, 1);
  const rowWeights = rawRowWeights.map(w => Math.max(w, maxRawRowWeight * 0.35));
  const totalRowWeight = rowWeights.reduce((s, w) => s + w, 0);
  const totalGapY = GRID_GAP * (rowGroups.length - 1);
  const availableHeight = 100 - totalGapY;

  const updated = new Map<string, RoomBox>();
  let yCursor = 0;

  rowGroups.forEach((row, rowIdx) => {
    const rowHeight = (rowWeights[rowIdx] / totalRowWeight) * availableHeight;
    if (row.length === 0) { yCursor += rowHeight + GRID_GAP; return; }

    const rawColWeights = row.map(r => r.colWeight ?? r.box?.width ?? 1);
    const maxRawColWeight = Math.max(...rawColWeights, 1);
    const colWeights = rawColWeights.map(w => Math.max(w, maxRawColWeight * 0.22));
    const totalColWeight = colWeights.reduce((s, w) => s + w, 0);
    const totalGapX = GRID_GAP * (row.length - 1);
    const availableWidth = 100 - totalGapX;

    let xCursor = 0;
    row.forEach((r, colIdx) => {
      const boxWidth = (colWeights[colIdx] / totalColWeight) * availableWidth;
      updated.set(r.id, {
        top:    yCursor,
        left:   xCursor,
        width:  boxWidth,
        height: rowHeight,
      });
      xCursor += boxWidth + GRID_GAP;
    });

    yCursor += rowHeight + GRID_GAP;
  });

  return rooms.map(r => updated.has(r.id) ? { ...r, box: updated.get(r.id)! } : r);
}

// ── Draggable / resizable colored room overlay ──
// Renders a room's box in the layout grid. When selected:
//  - dragging the box itself drags it OVER another room and SWAPS positions on drop
//    (rooms can never overlap, since swapping just exchanges two grid slots)
//  - the 4 corner handles resize the room, which shrinks/grows neighboring rooms
//    in the same row/column to compensate, via the parent's relayout
//
// `interactive=false` renders a read-only version (no selection, no drag/resize
// handles) — used on the canvas page where editing happens elsewhere, or before
// the user has selected anything to edit.
type DragMode = 'swap' | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br';

export function RoomOverlayBox({
  room,
  isSelected,
  hasSelection,
  onSelect,
  onResize,
  onSwap,
  interactive = true,
}: {
  room: GridRoom;
  isSelected: boolean;
  hasSelection: boolean;
  onSelect: () => void;
  onResize?: (box: RoomBox) => void;
  onSwap?: (targetId: string) => void;
  interactive?: boolean;
}) {
  const box = room.box!;
  const elRef = useRef<HTMLDivElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragState = useRef<{
    mode: DragMode;
    startX: number;
    startY: number;
    startBox: RoomBox;
    parentW: number;
    parentH: number;
    parentEl: HTMLElement;
  } | null>(null);

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  const handlePointerMove = (e: PointerEvent) => {
    const state = dragState.current;
    if (!state) return;

    if (state.mode === 'swap') {
      // Visually preview the drag with a floating ghost via CSS transform,
      // and highlight whichever room box is currently under the pointer.
      const el = elRef.current;
      if (el) {
        const dx = e.clientX - state.startX;
        const dy = e.clientY - state.startY;
        el.style.transform = `translate(${dx}px, ${dy}px)`;
        el.style.zIndex = '40';
        el.style.opacity = '0.85';
      }

      const elemUnder = document.elementFromPoint(e.clientX, e.clientY);
      const overBox = elemUnder?.closest('[data-room-box]') as HTMLElement | null;
      document.querySelectorAll('[data-room-box]').forEach(elx => {
        (elx as HTMLElement).style.outline = '';
        (elx as HTMLElement).style.outlineOffset = '';
      });
      if (overBox && overBox.dataset.roomId !== room.id) {
        overBox.style.outline = '3px dashed #004643';
        overBox.style.outlineOffset = '2px';
      }
      return;
    }

    const dxPct = ((e.clientX - state.startX) / state.parentW) * 100;
    const dyPct = ((e.clientY - state.startY) / state.parentH) * 100;
    let next: RoomBox = { ...state.startBox };

    // Resize from whichever corner was grabbed, keeping the opposite corner fixed
    const minSize = 3; // minimum 3% box size so it never collapses to nothing
    if (state.mode === 'resize-br') {
      next.width  = clamp(state.startBox.width + dxPct, minSize, 100 - state.startBox.left);
      next.height = clamp(state.startBox.height + dyPct, minSize, 100 - state.startBox.top);
    } else if (state.mode === 'resize-tr') {
      next.width  = clamp(state.startBox.width + dxPct, minSize, 100 - state.startBox.left);
      const newTop = clamp(state.startBox.top + dyPct, 0, state.startBox.top + state.startBox.height - minSize);
      next.height = state.startBox.height + (state.startBox.top - newTop);
      next.top    = newTop;
    } else if (state.mode === 'resize-bl') {
      const newLeft = clamp(state.startBox.left + dxPct, 0, state.startBox.left + state.startBox.width - minSize);
      next.width  = state.startBox.width + (state.startBox.left - newLeft);
      next.left   = newLeft;
      next.height = clamp(state.startBox.height + dyPct, minSize, 100 - state.startBox.top);
    } else if (state.mode === 'resize-tl') {
      const newLeft = clamp(state.startBox.left + dxPct, 0, state.startBox.left + state.startBox.width - minSize);
      const newTop  = clamp(state.startBox.top + dyPct, 0, state.startBox.top + state.startBox.height - minSize);
      next.width  = state.startBox.width + (state.startBox.left - newLeft);
      next.height = state.startBox.height + (state.startBox.top - newTop);
      next.left   = newLeft;
      next.top    = newTop;
    }

    onResize?.(next);
  };

  const handlePointerUp = (e: PointerEvent) => {
    const state = dragState.current;
    if (state?.mode === 'swap') {
      const el = elRef.current;
      if (el) {
        el.style.transform = '';
        el.style.zIndex = '';
        el.style.opacity = '';
      }
      const elemUnder = document.elementFromPoint(e.clientX, e.clientY);
      const overBox = elemUnder?.closest('[data-room-box]') as HTMLElement | null;
      document.querySelectorAll('[data-room-box]').forEach(elx => {
        (elx as HTMLElement).style.outline = '';
        (elx as HTMLElement).style.outlineOffset = '';
      });
      if (overBox && overBox.dataset.roomId && overBox.dataset.roomId !== room.id) {
        onSwap?.(overBox.dataset.roomId);
      }
      setIsDraggingOver(false);
    }

    dragState.current = null;
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  };

  const startDrag = (mode: DragMode, e: React.PointerEvent) => {
    if (!interactive) return;
    e.stopPropagation();
    e.preventDefault();
    const parent = (e.currentTarget as HTMLElement).closest('[data-overlay-root]') as HTMLElement | null;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    dragState.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startBox: { ...box },
      parentW: rect.width,
      parentH: rect.height,
      parentEl: parent,
    };
    if (mode === 'swap') setIsDraggingOver(true);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handleStyle = "absolute w-[10px] h-[10px] bg-white border-2 border-[#004643] rounded-full z-30 hover:scale-125 transition-transform";

  // When another room is selected, fade this one to a thin outline so the
  // selected room's true boundary is easy to see against the real floor plan.
  const dimmed = hasSelection && !isSelected;

  return (
    <div
      ref={elRef}
      data-room-box
      data-room-id={room.id}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onPointerDown={(e) => interactive && isSelected && startDrag('swap', e)}
      className={`absolute flex items-center justify-center rounded-[3px] transition-all border-2 ${
        isSelected
          ? `border-[#004643] shadow-md z-20 ${interactive ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`
          : dimmed
            ? 'border-[#8e9493]/40 z-10 cursor-pointer hover:border-[#004643]/60'
            : 'border-transparent hover:border-[#004643]/50 z-10 cursor-pointer'
      }`}
      style={{
        top:             `${box.top}%`,
        left:            `${box.left}%`,
        width:           `${box.width}%`,
        height:          `${box.height}%`,
        backgroundColor: dimmed ? 'transparent' : room.color + (isSelected ? '80' : '55'),
        transition:      isDraggingOver ? 'none' : undefined,
      }}
      title={room.name}
    >
      {(box.width >= 6 && box.height >= 6) ? (
        <span
          className={`text-[11px] font-semibold text-center leading-tight rounded px-1 pointer-events-none whitespace-nowrap overflow-hidden text-ellipsis block w-full ${
            dimmed ? 'text-[#8e9493] bg-transparent' : 'text-[#004643] bg-white/70'
          }`}
        >
          {room.name}
        </span>
      ) : (
        // Box too small to fit readable text — show a small dot instead of truncating mid-word
        <span className={`w-[6px] h-[6px] rounded-full pointer-events-none ${dimmed ? 'bg-[#8e9493]/50' : 'bg-[#004643]/60'}`} />
      )}

      {interactive && isSelected && (
        <>
          <div onPointerDown={(e) => startDrag('resize-tl', e)} className={handleStyle} style={{ top: -5, left: -5, cursor: 'nwse-resize' }} />
          <div onPointerDown={(e) => startDrag('resize-tr', e)} className={handleStyle} style={{ top: -5, right: -5, cursor: 'nesw-resize' }} />
          <div onPointerDown={(e) => startDrag('resize-bl', e)} className={handleStyle} style={{ bottom: -5, left: -5, cursor: 'nesw-resize' }} />
          <div onPointerDown={(e) => startDrag('resize-br', e)} className={handleStyle} style={{ bottom: -5, right: -5, cursor: 'nwse-resize' }} />
        </>
      )}
    </div>
  );
}