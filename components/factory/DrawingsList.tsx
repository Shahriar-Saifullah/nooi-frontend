"use client";

/**
 * A list of factory drawings (DWG / DXF / PDF) with download links, and an
 * "Add drawing" button. The parent does the uploading and removing
 * (lib/api/factory), so the same list serves listings, drafts and order lines.
 */

import React, { useRef, useState } from "react";
import { FileText, Loader2, Paperclip, Trash2, Download } from "lucide-react";
import { DRAWING_ACCEPT, MAX_DRAWING_MB, fileProblem, formatBytes, type Drawing } from "@/lib/api/factory";

const ROLE: Record<Drawing["role"], string> = { vendor: "Factory", customer: "Client", admin: "Nooi" };

export default function DrawingsList({
  drawings, onAdd, onRemove, canRemove = () => true, addLabel = "Add drawing", empty = "No drawings yet.", max = 10, compact = false,
}: {
  drawings: Drawing[];
  /** upload + attach one file; omit to make the list read-only */
  onAdd?: (file: File) => Promise<void>;
  onRemove?: (d: Drawing) => Promise<void>;
  canRemove?: (d: Drawing) => boolean;
  addLabel?: string;
  empty?: string;
  max?: number;
  compact?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pick = async (files: FileList | null) => {
    if (!files?.length || !onAdd) return;
    setError(null);
    for (const f of Array.from(files)) {
      const problem = fileProblem(f);
      if (problem) { setError(`${f.name}: ${problem}`); continue; }
      setBusy(f.name);
      try { await onAdd(f); } catch (e) { setError(e instanceof Error ? e.message : "Upload failed."); }
    }
    setBusy(null);
    if (input.current) input.current.value = "";
  };

  const remove = async (d: Drawing) => {
    if (!onRemove) return;
    setBusy(d.path); setError(null);
    try { await onRemove(d); } catch (e) { setError(e instanceof Error ? e.message : "Could not remove it."); }
    setBusy(null);
  };

  return (
    <div className="flex flex-col gap-1.5">
      {drawings.length === 0 && <p className="text-[12px] text-[#646968]">{empty}</p>}
      {drawings.map(d => (
        <div key={d.path} className="flex items-center gap-2 rounded-[8px] border border-[#E3E7E6] bg-white px-2.5 py-1.5">
          <FileText size={15} className="shrink-0 text-[#003832]" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12.5px] font-medium text-[#101212]" title={d.name}>{d.name}</div>
            {!compact && (
              <div className="text-[10.5px] text-[#646968]">
                {d.kind.toUpperCase()} · {formatBytes(d.size)} · added by {ROLE[d.role] ?? d.role}
                {d.uploaded_at ? ` · ${new Date(d.uploaded_at).toLocaleDateString()}` : ""}
              </div>
            )}
          </div>
          {d.url && (
            <a href={d.url} target="_blank" rel="noreferrer" title="Download" className="rounded-[6px] p-1 text-[#003832] hover:bg-[#EEF3F2]">
              <Download size={14} />
            </a>
          )}
          {onRemove && canRemove(d) && (
            <button type="button" onClick={() => remove(d)} disabled={!!busy} title="Remove" className="rounded-[6px] p-1 text-[#9A1C1C] hover:bg-[#FDECEC] disabled:opacity-50">
              {busy === d.path ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            </button>
          )}
        </div>
      ))}
      {onAdd && drawings.length < max && (
        <div>
          <input ref={input} type="file" accept={DRAWING_ACCEPT} multiple hidden onChange={e => pick(e.target.files)} />
          <button type="button" onClick={() => input.current?.click()} disabled={!!busy}
            className="inline-flex items-center gap-1.5 rounded-[8px] border border-dashed border-[#9DB3AE] px-3 py-1.5 text-[12px] font-medium text-[#003832] hover:bg-[#F2F7F6] disabled:opacity-60">
            {busy && !drawings.some(d => d.path === busy) ? <Loader2 size={13} className="animate-spin" /> : <Paperclip size={13} />}
            {busy && !drawings.some(d => d.path === busy) ? `Uploading ${busy}…` : addLabel}
          </button>
          <span className="ml-2 text-[10.5px] text-[#8A8F8E]">DWG, DXF or PDF, up to {MAX_DRAWING_MB} MB each</span>
        </div>
      )}
      {error && <p className="text-[11.5px] text-[#B91C1C]">{error}</p>}
    </div>
  );
}
