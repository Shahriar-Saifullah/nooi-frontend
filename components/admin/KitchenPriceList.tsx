"use client";

/**
 * Admin → Settings → Kitchen price list. What the canvas kitchen builder
 * quotes from: SAR per metre of cabinet, per metre of worktop, per unit for
 * hoods, handles and appliances. Super admins edit; others see it.
 */

import React, { useEffect, useState } from "react";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { getPlatformSettings, updatePlatformSettings } from "@/lib/api/admin";
import { cleanKitchenPrices, KITCHEN_KINDS, type KitchenPriceList } from "@/lib/kitchen/pricing";
import { MODULES } from "@/lib/kitchen/model";
import { COUNTERTOPS, HARDWARE } from "@/lib/kitchen/materials";

const input = "mt-1 w-full rounded-xl border border-[#D5DBDA] bg-white px-3 py-1.5 text-[13px] focus:border-[#87DDD7] focus:outline-none disabled:bg-[#F7F9F9] disabled:text-[#646968]";
const APPLIANCES = ["sink-base", "dishwasher", "cooktop-gas", "cooktop-induction", "oven-tower", "fridge-single"] as const;
const APPLIANCE_NAME: Record<string, string> = {
  "sink-base": "Sink & mixer tap", dishwasher: "Dishwasher", "cooktop-gas": "Gas hob",
  "cooktop-induction": "Induction hob", "oven-tower": "Built-in oven", "fridge-single": "Fridge",
};

function Num({ label, value, onChange, disabled, suffix }: {
  label: string; value: number; onChange: (n: number) => void; disabled: boolean; suffix?: string;
}) {
  return (
    <label className="text-[12px] text-[#646968]">
      {label}{suffix && <span className="text-[#8E9493]"> ({suffix})</span>}
      <input className={input} disabled={disabled} inputMode="decimal" defaultValue={String(value)}
        onBlur={e => { const n = Number(e.currentTarget.value); if (Number.isFinite(n) && n >= 0) onChange(n); else e.currentTarget.value = String(value); }} />
    </label>
  );
}

export default function KitchenPriceListCard() {
  const [p, setP] = useState<KitchenPriceList | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [rev, setRev] = useState(0);

  useEffect(() => {
    getPlatformSettings().then(r => {
      if (!r.success) return;
      setP(cleanKitchenPrices((r.data.settings as { kitchen_prices?: unknown }).kitchen_prices));
      setCanEdit(r.data.can_edit);
    });
  }, []);

  if (!p) {
    return (
      <section className="rounded-2xl border border-[#D5DBDA] bg-white p-6">
        <h2 className="text-[15px] font-medium text-[#101212]">Kitchen price list</h2>
        <Loader2 className="mt-4 h-5 w-5 animate-spin text-[#004643]" />
      </section>
    );
  }
  const ro = !canEdit;
  const setIn = <K extends keyof KitchenPriceList>(k: K, sub: string, n: number) =>
    setP({ ...p, [k]: { ...(p[k] as Record<string, number>), [sub]: n } });

  const save = async () => {
    setBusy(true); setMsg(null);
    const r = await updatePlatformSettings({ kitchen_prices: p });
    setBusy(false);
    if (r.success) {
      setP(cleanKitchenPrices((r.data.settings as { kitchen_prices?: unknown }).kitchen_prices));
      setRev(x => x + 1);
      setMsg({ ok: true, text: "Saved — new kitchen quotes use these prices." });
    } else setMsg({ ok: false, text: typeof r.error === "string" ? r.error : "Could not save." });
  };

  return (
    <section key={rev} className="rounded-2xl border border-[#D5DBDA] bg-white p-6">
      <h2 className="text-[15px] font-medium text-[#101212]">Kitchen price list</h2>
      <p className="mt-0.5 text-[12px] text-[#646968]">
        {ro ? "Only a super administrator can change these. " : ""}
        The kitchen builder quotes clients from these prices (SAR, before VAT). Cabinets and worktops are per metre of run.
      </p>

      <h3 className="mt-5 text-[12.5px] font-medium text-[#101212]">Cabinets — per metre</h3>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {KITCHEN_KINDS.map(k => (
          <Num key={k} label={MODULES[k].label} suffix="SAR/m" value={p.cabinet_per_m[k]} disabled={ro} onChange={n => setIn("cabinet_per_m", k, n)} />
        ))}
        <Num label="Wall cabinets" suffix="SAR/m" value={p.upper_per_m} disabled={ro} onChange={n => setP({ ...p, upper_per_m: n })} />
        <Num label="Cooker hood" suffix="SAR each" value={p.hood_unit} disabled={ro} onChange={n => setP({ ...p, hood_unit: n })} />
      </div>

      <h3 className="mt-5 text-[12.5px] font-medium text-[#101212]">Worktops — per metre</h3>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {COUNTERTOPS.map(c => (
          <Num key={c.id} label={c.name} suffix="SAR/m" value={p.countertop_per_m[c.id] ?? p.countertop_default_per_m} disabled={ro} onChange={n => setIn("countertop_per_m", c.id, n)} />
        ))}
      </div>

      <h3 className="mt-5 text-[12.5px] font-medium text-[#101212]">Fronts and handles</h3>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Num label="Shaker fronts" suffix="× price" value={p.front_style_factor.shaker ?? 1} disabled={ro} onChange={n => setIn("front_style_factor", "shaker", n)} />
        <Num label="Raised-arch fronts" suffix="× price" value={p.front_style_factor["raised-arch"] ?? 1} disabled={ro} onChange={n => setIn("front_style_factor", "raised-arch", n)} />
        <Num label="Wood-veneer fronts" suffix="× price" value={p.wood_front_factor} disabled={ro} onChange={n => setP({ ...p, wood_front_factor: n })} />
        <Num label="Bar handle" suffix="SAR each" value={p.handle_unit.bar ?? 0} disabled={ro} onChange={n => setIn("handle_unit", "bar", n)} />
        <Num label="Knob" suffix="SAR each" value={p.handle_unit.knob ?? 0} disabled={ro} onChange={n => setIn("handle_unit", "knob", n)} />
        {HARDWARE.filter(h => h.id !== "chrome").map(h => (
          <Num key={h.id} label={`${h.name} hardware`} suffix="× handle" value={p.hardware_factor[h.id] ?? 1} disabled={ro} onChange={n => setIn("hardware_factor", h.id, n)} />
        ))}
      </div>

      <h3 className="mt-5 text-[12.5px] font-medium text-[#101212]">Appliances — per unit (only when the client includes them)</h3>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {APPLIANCES.map(k => (
          <Num key={k} label={APPLIANCE_NAME[k]} suffix="SAR" value={p.appliance_unit[k] ?? 0} disabled={ro} onChange={n => setIn("appliance_unit", k, n)} />
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Num label="Delivery & installation" suffix="% of total" value={p.install_percent} disabled={ro} onChange={n => setP({ ...p, install_percent: n })} />
      </div>

      {!ro && (
        <button disabled={busy} onClick={save}
          className="mt-5 flex items-center gap-1.5 rounded-full bg-[#004643] px-5 py-2 text-[12.5px] font-medium text-white disabled:opacity-60">
          {busy && <Loader2 size={12} className="animate-spin" />} Save kitchen prices
        </button>
      )}
      {msg && (
        <p className={`mt-3 flex items-center gap-1.5 text-[12.5px] ${msg.ok ? "text-[#28603A]" : "text-[#812F28]"}`}>
          {msg.ok ? <Check size={13} /> : <AlertCircle size={13} />} {msg.text}
        </p>
      )}
    </section>
  );
}
