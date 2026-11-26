"use client";

/**
 * "For the factory" on an order: each line's drawings and its factory spec
 * (the options form from the factories' own drawing sheets). Shown to the
 * client, to the vendor making the line, and to admins (backend decides who
 * sees which lines and who may edit).
 *
 * Every field is optional text — factories treat sizes and options as
 * guidance they confirm, not rules.
 */

import React, { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Factory, Loader2, Check } from "lucide-react";
import DrawingsList from "@/components/factory/DrawingsList";
import { createClient } from "@/utils/supabase/client";
import {
  attachLineDrawing, orderFactoryLines, removeLineDrawing, saveLineSpec,
  type FactoryLine, type SpecField,
} from "@/lib/api/factory";

type Role = "customer" | "vendor" | "admin";

const INTRO: Record<Role, string> = {
  customer: "Add your drawings and any details the factory should follow. Everything here is optional; the factory confirms sizes and options with you.",
  vendor: "The client's drawings and details for each item you're making. Add your own drawing (for example, a shop drawing) if you need the client to check it.",
  admin: "Drawings and factory details for each line. Admins can edit everything.",
};

export default function OrderFactoryPanel({ orderId, currentUserId, title = "For the factory", defaultOpen = false }: {
  orderId: string;
  /** lets the list show "remove" only on files this user added */
  currentUserId?: string | null;
  title?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [data, setData] = useState<{ role: Role; items: FactoryLine[]; fields: SpecField[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  // who is looking: decides which drawings show a remove button
  const [me, setMe] = useState<string | null>(currentUserId ?? null);
  useEffect(() => {
    if (currentUserId) return;
    createClient().auth.getUser().then(({ data }) => setMe(data.user?.id ?? null)).catch(() => undefined);
  }, [currentUserId]);

  const load = useCallback(() => {
    orderFactoryLines(orderId).then(d => { setData(d); setError(null); }).catch(e => setError(e instanceof Error ? e.message : "Could not load."));
  }, [orderId]);
  useEffect(() => { if (open && !data) load(); }, [open, data, load]);

  const setLine = (id: string, patch: Partial<FactoryLine>) =>
    setData(d => (d ? { ...d, items: d.items.map(i => (i.id === id ? { ...i, ...patch } : i)) } : d));

  const count = data?.items.reduce((a, i) => a + i.drawings.length, 0) ?? 0;

  return (
    <section className="rounded-[12px] border border-[#E3E7E6] bg-[#FBFCFC]">
      <button type="button" onClick={() => setOpen(o => !o)} className="flex w-full items-center gap-2 px-4 py-3 text-left">
        <Factory size={16} className="text-[#003832]" />
        <span className="flex-1 text-[14px] font-semibold text-[#101212]">{title}</span>
        {data && <span className="text-[11.5px] text-[#646968]">{count} drawing{count === 1 ? "" : "s"}</span>}
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      {open && (
        <div className="flex flex-col gap-4 border-t border-[#E3E7E6] px-4 py-3">
          {!data && !error && <div className="flex items-center gap-2 text-[12.5px] text-[#646968]"><Loader2 size={14} className="animate-spin" />Loading…</div>}
          {error && <p className="text-[12.5px] text-[#B91C1C]">{error}</p>}
          {data && <p className="text-[12px] leading-snug text-[#646968]">{INTRO[data.role]}</p>}
          {data?.items.map(line => (
            <LineCard key={line.id} line={line} fields={data.fields} role={data.role} currentUserId={currentUserId ?? me}
              onChange={patch => setLine(line.id, patch)} />
          ))}
        </div>
      )}
    </section>
  );
}

function LineCard({ line, fields, role, currentUserId, onChange }: {
  line: FactoryLine; fields: SpecField[]; role: Role; currentUserId?: string | null;
  onChange: (patch: Partial<FactoryLine>) => void;
}) {
  const [draft, setDraft] = useState<Record<string, string>>(line.spec.fields ?? {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const filled = fields.filter(f => (line.spec.fields ?? {})[f.key]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(line.spec.fields ?? {});

  const save = async () => {
    setSaving(true); setError(null);
    try {
      const spec = await saveLineSpec(line.id, draft);
      onChange({ spec });
      setDraft(spec.fields);
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save."); }
    setSaving(false);
  };

  const show = line.can_edit_spec ? (showAll ? fields : fields.filter(f => draft[f.key] || ["dimensions", "carcass", "doors", "handles", "notes"].includes(f.key))) : filled;

  return (
    <div className="rounded-[10px] border border-[#E3E7E6] bg-white p-3">
      <div className="mb-2">
        <div className="text-[13.5px] font-semibold text-[#101212]">{line.title}{line.quantity > 1 ? ` × ${line.quantity}` : ""}</div>
        {line.config_label && <div className="text-[11.5px] text-[#4B4F4F]">{line.config_label}</div>}
      </div>

      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#646968]">Drawings</div>
      <DrawingsList
        drawings={line.drawings}
        empty={role === "vendor" ? "The client hasn't added drawings." : "No drawings yet."}
        onAdd={line.can_attach ? async f => onChange({ drawings: await attachLineDrawing(line.id, f) }) : undefined}
        onRemove={async d => onChange({ drawings: await removeLineDrawing(line.id, d.path) })}
        canRemove={d => role === "admin" || d.uploaded_by === currentUserId}
      />

      <div className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-wide text-[#646968]">Details for the factory</div>
      {!line.can_edit_spec && filled.length === 0 && <p className="text-[12px] text-[#646968]">No details given.</p>}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {show.map(f => (
          <label key={f.key} className={`flex flex-col gap-0.5 ${f.key === "notes" ? "sm:col-span-2" : ""}`}>
            <span className="text-[11.5px] text-[#4B4F4F]">{f.label} <span className="text-[#9AA09F]">{f.zh}</span></span>
            {line.can_edit_spec ? (
              f.key === "notes" ? (
                <textarea value={draft[f.key] ?? ""} rows={3} maxLength={2000} onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))}
                  className="rounded-[7px] border border-[#D5DBDA] px-2.5 py-1.5 text-[12.5px] outline-none focus:border-[#003832]" />
              ) : (
                <input value={draft[f.key] ?? ""} maxLength={300} onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))}
                  className="rounded-[7px] border border-[#D5DBDA] px-2.5 py-1.5 text-[12.5px] outline-none focus:border-[#003832]" />
              )
            ) : (
              <span className="whitespace-pre-wrap text-[12.5px] text-[#101212]">{line.spec.fields[f.key]}</span>
            )}
          </label>
        ))}
      </div>
      {line.can_edit_spec && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {!showAll && (
            <button type="button" onClick={() => setShowAll(true)} className="text-[12px] font-medium text-[#003832] underline">
              More fields (back, hinges, runners, fillers, kick board …)
            </button>
          )}
          <span className="flex-1" />
          {error && <span className="text-[11.5px] text-[#B91C1C]">{error}</span>}
          <button type="button" onClick={save} disabled={!dirty || saving}
            className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#003832] px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-40">
            {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <Check size={13} /> : null}
            {saved ? "Saved" : "Save details"}
          </button>
        </div>
      )}
      {line.spec.updated_at && <p className="mt-1.5 text-[10.5px] text-[#8A8F8E]">Last updated {new Date(line.spec.updated_at).toLocaleString()}</p>}
    </div>
  );
}
