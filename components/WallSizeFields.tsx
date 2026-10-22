"use client";

/**
 * Exact wall size — components/WallSizeFields.tsx
 * Length and thickness of the selected wall, in centimetres. Applied on Enter
 * or when the field loses focus, so typing "4" on the way to "450" does not
 * resize the wall to 4 cm half-way through.
 */

import { useState } from "react";

interface Props {
  lengthCm: number;
  thicknessCm: number;
  onLength: (cm: number) => void;
  onThickness: (cm: number) => void;
}

function Field({
  label, value, min, max, onApply, hint,
}: {
  label: string; value: number; min: number; max: number;
  onApply: (v: number) => void; hint?: string;
}) {
  const [text, setText] = useState(String(Math.round(value)));

  const apply = () => {
    const v = Number(text);
    if (!Number.isFinite(v)) { setText(String(Math.round(value))); return; }
    const clamped = Math.max(min, Math.min(max, Math.round(v)));
    setText(String(clamped));
    if (clamped !== Math.round(value)) onApply(clamped);
  };

  return (
    <label className="flex-1 block text-[11px] text-[#737373]">
      {label}
      <div className="mt-1 flex items-center rounded-[8px] border border-[#e5e5e5] bg-white px-2 focus-within:border-[#0f5c4f]">
        <input
          type="number" inputMode="numeric" min={min} max={max}
          value={text}
          onChange={e => setText(e.target.value)}
          onBlur={apply}
          onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          className="w-full py-1.5 text-[13px] text-[#0a0a0a] outline-none bg-transparent"
        />
        <span className="text-[11px] text-[#a3a3a3]">cm</span>
      </div>
      {hint && <span className="mt-0.5 block text-[10px] text-[#a3a3a3]">{hint}</span>}
    </label>
  );
}

export default function WallSizeFields({ lengthCm, thicknessCm, onLength, onThickness }: Props) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-[#a3a3a3] uppercase tracking-wide mb-1.5">Size</p>
      <div className="flex gap-2">
        {/* keyed by value: when the wall is dragged in 3D the field restarts
            from the new size instead of keeping stale text */}
        <Field key={`l${Math.round(lengthCm)}`} label="Length" value={lengthCm} min={30} max={5000} onApply={onLength} />
        <Field key={`t${Math.round(thicknessCm)}`} label="Thickness" value={thicknessCm} min={9} max={20} onApply={onThickness} hint="9–20 cm" />
      </div>
      <p className="mt-1.5 text-[10px] text-[#a3a3a3]">
        Or drag the white handles at its ends, or the green one to slide it. Joined walls, rooms, doors and windows follow.
      </p>
    </div>
  );
}
