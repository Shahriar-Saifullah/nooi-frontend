"use client";

/**
 * On the product page: the width (per-metre listings) and the vendor's
 * options — fabric, legs, handles, colour codes, textures — with swatches.
 * Controlled; the price comes from lib/listings/configure.
 */

import React from "react";
import type { OptionGroup } from "@/lib/listings/configure";

const COPY = {
  en: {
    width: "Width", made: (a: string, b: string) => `Made to measure, ${a}–${b} cm`,
    perMetre: "per metre of width", extra: (s: string) => `+${s}`, code: "Code",
  },
  ar: {
    width: "العرض", made: (a: string, b: string) => `حسب المقاس، ${a}–${b} سم`,
    perMetre: "لكل متر من العرض", extra: (s: string) => `+${s}`, code: "الرمز",
  },
};

export default function ProductConfigurator({
  perMetre, minWidth, maxWidth, width, onWidth, groups, picked, onPick, money, num, arabic = false,
}: {
  perMetre: boolean;
  minWidth: number;
  maxWidth: number;
  width: number;
  onWidth: (cm: number) => void;
  groups: OptionGroup[];
  picked: Record<string, string>;
  onPick: (group: string, choice: string) => void;
  money: (n: number) => string;
  num: (n: number) => string;
  arabic?: boolean;
}) {
  const t = COPY[arabic ? "ar" : "en"];
  return (
    <div className="mt-6 flex flex-col gap-5">
      {perMetre && (
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-[12px] text-[#646968]">{t.width}: <strong className="text-[#101212]">{num(width)} cm</strong></span>
            <span className="text-[11px] text-[#8E9493]">{t.made(num(minWidth), num(maxWidth))}</span>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <input
              type="range" min={minWidth} max={maxWidth} step={1} value={width}
              onChange={e => onWidth(Number(e.target.value))}
              className="flex-1 accent-[#004643]" aria-label={t.width}
            />
            <input
              key={width}
              type="number" min={minWidth} max={maxWidth} defaultValue={width}
              onBlur={e => onWidth(Math.max(minWidth, Math.min(maxWidth, Math.round(Number(e.target.value) || width))))}
              onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }}
              className="w-[76px] rounded-lg border border-[#D5DBDA] px-2 py-1.5 text-[12.5px] text-end"
            />
            <span className="text-[12px] text-[#8E9493]">cm</span>
          </div>
        </div>
      )}

      {groups.map(g => {
        const cur = g.choices.find(c => c.id === picked[g.id]) ?? g.choices[0];
        return (
          <div key={g.id}>
            <span className="text-[12px] text-[#646968]">
              {g.name}: <strong className="text-[#101212]">{cur?.name}</strong>
              {cur?.code && <span className="text-[#8E9493]"> · {t.code} {cur.code}</span>}
              {cur && cur.price_delta !== 0 && (
                <span className="text-[#8E9493]"> · {t.extra(money(cur.price_delta))}{perMetre ? ` ${t.perMetre}` : ""}</span>
              )}
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {g.choices.map(c => {
                const on = c.id === cur?.id;
                const swatch = c.image || c.hex;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onPick(g.id, c.id)}
                    title={`${c.name}${c.code ? ` (${c.code})` : ""}${c.price_delta ? ` +${money(c.price_delta)}` : ""}`}
                    aria-pressed={on}
                    className={`flex items-center gap-2 rounded-full border py-1 ps-1 pe-3 text-[12px] transition-colors
                      ${on ? "border-[#004643] bg-[#F3FEFD] text-[#004643]" : "border-[#D5DBDA] text-[#343837] hover:border-[#87DDD7]"}`}
                  >
                    <span
                      className="h-6 w-6 shrink-0 rounded-full border border-black/10 bg-[#F1F4F4] bg-cover bg-center"
                      style={c.image ? { backgroundImage: `url("${c.image}")` } : swatch ? { background: swatch } : undefined}
                    />
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
