"use client";

/**
 * The kitchen's price, live, under the kitchen builder controls. Quoted from
 * Nooi's price list (admin → Settings): cabinets and worktop per metre,
 * hoods, handles and appliances per unit, then installation and VAT.
 */

import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { requestApi } from "@/lib/api/http";
import { cleanKitchenPrices, quoteKitchen, DEFAULT_KITCHEN_PRICES, type KitchenPriceList } from "@/lib/kitchen/pricing";
import { COUNTERTOPS } from "@/lib/kitchen/materials";
import type { KitchenData } from "@/lib/kitchen/model";
import { formatMoney } from "@/lib/money";

let cached: KitchenPriceList | null = null;

export function useKitchenPrices(): KitchenPriceList {
  const [p, setP] = useState<KitchenPriceList>(cached ?? DEFAULT_KITCHEN_PRICES);
  useEffect(() => {
    if (cached) return;
    let live = true;
    requestApi<{ prices: unknown }>({ path: "/marketplace/kitchen-prices", method: "GET" }).then(res => {
      if (!res.success) return;
      cached = cleanKitchenPrices(res.data.prices);
      if (live) setP(cached);
    });
    return () => { live = false; };
  }, []);
  return p;
}

export default function KitchenEstimate({ data }: { data: KitchenData }) {
  const prices = useKitchenPrices();
  const [withAppliances, setWithAppliances] = useState(false);
  const [open, setOpen] = useState(false);
  const q = useMemo(() => quoteKitchen(data, prices, {
    includeAppliances: withAppliances,
    countertopName: COUNTERTOPS.find(c => c.id === data.style.countertop)?.name,
  }), [data, prices, withAppliances]);
  const money = (n: number) => formatMoney(n, q.currency);

  if (q.metres === 0) return null;
  return (
    <div className="mt-3 rounded-[9px] bg-white/[0.06] p-2.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-wide text-white/45">Estimate</span>
        <span className="text-[10.5px] text-white/55">{q.metres.toFixed(2)} m of units</span>
      </div>
      <div className="mt-1 flex items-baseline justify-between">
        <span className="text-[16px] font-semibold">{money(q.total)}</span>
        <span className="text-[10.5px] text-white/55">incl. VAT &amp; fitting</span>
      </div>
      <label className="mt-2 flex cursor-pointer items-center gap-2 text-[11px] text-white/80">
        <input type="checkbox" checked={withAppliances} onChange={e => setWithAppliances(e.target.checked)} className="accent-[#c7de7d]" />
        Include appliances, sink &amp; tap
      </label>
      <button onClick={() => setOpen(o => !o)} className="mt-2 flex items-center gap-1 text-[10.5px] text-white/60 hover:text-white">
        <ChevronDown size={11} className={open ? "rotate-180" : ""} /> {open ? "Hide" : "Show"} breakdown
      </button>
      {open && (
        <div className="mt-1.5 space-y-1 text-[10.5px]">
          {q.lines.map(l => (
            <div key={l.key} className="flex justify-between gap-2">
              <span className="text-white/70">
                {l.label}
                <span className="text-white/40"> · {l.unit === "m" ? `${l.qty.toFixed(2)} m × ${money(l.rate)}` : `${l.qty} × ${money(l.rate)}`}</span>
              </span>
              <span className="shrink-0">{money(l.amount)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-white/10 pt-1"><span className="text-white/70">Delivery &amp; installation ({prices.install_percent}%)</span><span>{money(q.install)}</span></div>
          <div className="flex justify-between"><span className="text-white/70">VAT 15%</span><span>{money(q.vat)}</span></div>
          <p className="pt-1 text-[10px] leading-snug text-white/45">An estimate from Nooi&apos;s price list. The final price is confirmed after a measurement visit.</p>
        </div>
      )}
    </div>
  );
}
