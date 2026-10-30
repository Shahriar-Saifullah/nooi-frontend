"use client";

/**
 * Photos on support tickets — picker (new ticket, replies) and the grid shown
 * under a message. Used by customers, vendors (SupportCenter) and admins.
 * Photos are checked here for count/size/type so people get instant feedback;
 * the server re-checks, shrinks them and strips their location data.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, X, ImageOff } from "lucide-react";
import { MAX_SUPPORT_PHOTOS, MAX_SUPPORT_PHOTO_BYTES, type SupportAttachment } from "@/lib/api/support";

const OK_TYPES = /^image\/(jpeg|png|webp)$/;

export function PhotoPicker({
  photos, onChange, disabled = false,
}: { photos: File[]; onChange: (files: File[]) => void; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Preview links for the chosen files, released when they change.
  const previews = useMemo(() => photos.map(f => URL.createObjectURL(f)), [photos]);
  useEffect(() => () => previews.forEach(u => URL.revokeObjectURL(u)), [previews]);

  const add = (list: FileList | null) => {
    if (!list?.length) return;
    const next = [...photos];
    let problem: string | null = null;
    for (const f of Array.from(list)) {
      if (next.length >= MAX_SUPPORT_PHOTOS) { problem = `You can attach up to ${MAX_SUPPORT_PHOTOS} photos.`; break; }
      if (!OK_TYPES.test(f.type)) { problem = `"${f.name}" isn't a JPG, PNG or WebP photo.`; continue; }
      if (f.size > MAX_SUPPORT_PHOTO_BYTES) { problem = `"${f.name}" is over 10 MB.`; continue; }
      next.push(f);
    }
    setError(problem);
    onChange(next);
    if (input.current) input.current.value = "";
  };

  return (
    <div className="mt-2">
      {photos.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {photos.map((f, i) => (
            <div key={`${f.name}-${i}`} className="relative h-16 w-16 overflow-hidden rounded-lg border border-[#D5DBDA] bg-[#F4F6F6]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previews[i]} alt={f.name} className="h-full w-full object-cover" />
              <button type="button" disabled={disabled} aria-label={`Remove ${f.name}`}
                onClick={() => { setError(null); onChange(photos.filter((_, j) => j !== i)); }}
                className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white">
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden"
        onChange={e => add(e.target.files)} />
      {photos.length < MAX_SUPPORT_PHOTOS && (
        <button type="button" disabled={disabled} onClick={() => input.current?.click()}
          className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#004643] hover:underline disabled:opacity-50">
          <ImagePlus size={14} /> {photos.length ? "Add more photos" : "Add photos"}
          <span className="font-normal text-[#8E9493]">(up to {MAX_SUPPORT_PHOTOS})</span>
        </button>
      )}
      {error && <p className="mt-1 text-[12px] text-[#812F28]">{error}</p>}
    </div>
  );
}

export function MessagePhotos({ attachments }: { attachments?: SupportAttachment[] }) {
  if (!attachments?.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {attachments.map(a => a.url ? (
        <a key={a.path} href={a.url} target="_blank" rel="noopener noreferrer"
          className="block h-24 w-24 overflow-hidden rounded-lg border border-black/10 bg-white" title="Open full size">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={a.url} alt={a.name} loading="lazy" className="h-full w-full object-cover" />
        </a>
      ) : (
        <span key={a.path} className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border border-black/10 bg-white text-[10.5px] text-[#8E9493]">
          <ImageOff size={16} /> Unavailable
        </span>
      ))}
    </div>
  );
}
