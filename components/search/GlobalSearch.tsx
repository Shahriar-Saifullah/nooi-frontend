"use client";

/**
 * Platform-wide search palette — components/search/GlobalSearch.tsx
 * ============================================================================
 * Mounted once in the root layout. Opens with ⌘K / Ctrl+K anywhere, or from
 * any search button (openGlobalSearch). Results come as you type: pages and
 * categories instantly, then products, vendors, projects, orders, invoices,
 * tickets and accounts from the API — only what the person may see.
 * ↑ ↓ to move, Enter to open, Esc to close; "See all results" opens /search.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  Search, X, Loader2, CornerDownLeft, Clock, ArrowRight,
  Package, Store, FolderOpen, Receipt, FileText, LifeBuoy, UserRound, LayoutGrid, Compass,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/useTranslations";
import {
  KIND_LABEL, OPEN_SEARCH_EVENT, hitHref, localGroups, mergeGroups, recentSearches, rememberSearch, searchRemote,
  type SearchGroup, type SearchHit, type SearchKind, type SearchScope,
} from "@/lib/search/search";

export const KIND_ICON: Record<SearchKind, React.ReactNode> = {
  page: <Compass size={15} />,
  category: <LayoutGrid size={15} />,
  product: <Package size={15} />,
  vendor: <Store size={15} />,
  project: <FolderOpen size={15} />,
  order: <Receipt size={15} />,
  invoice: <FileText size={15} />,
  ticket: <LifeBuoy size={15} />,
  account: <UserRound size={15} />,
};

const STATUS_LABEL: Record<string, string> = {
  pending: "In review", rejected: "Changes requested", deactivated: "Off sale", draft: "Draft",
  suspended: "Suspended",
};

export function HitRow({ hit, active, onPick, onHover }: {
  hit: SearchHit; active: boolean; onPick: () => void; onHover?: () => void;
}) {
  const badge = hit.status && STATUS_LABEL[hit.status];
  return (
    <button
      type="button"
      onClick={onPick}
      onMouseMove={onHover}
      className={`flex w-full items-center gap-3 rounded-[10px] px-2.5 py-2 text-start transition-colors ${active ? "bg-[#F1F4F4]" : "hover:bg-[#F7F9F9]"}`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-[#EAEDEC] bg-white text-[#646968]">
        {hit.image
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={hit.image} alt="" className="h-full w-full object-cover" />
          : KIND_ICON[hit.kind]}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[13px] font-medium text-[#101212]">{hit.title}</span>
          {badge && <span className="shrink-0 rounded-full bg-[#FFF6E5] px-1.5 py-0.5 text-[10px] font-medium text-[#8A5A00]">{badge}</span>}
        </span>
        {hit.subtitle && <span className="block truncate text-[11.5px] text-[#8E9493]">{hit.subtitle}</span>}
      </span>
      {active && <CornerDownLeft size={13} className="shrink-0 text-[#8E9493]" />}
    </button>
  );
}

export default function GlobalSearch() {
  const router = useRouter();
  const { language, isRtl } = useLanguage();
  const arabic = language === "ar";
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<SearchScope>("public");
  // the API's answer, with the term it answered — stale answers are ignored
  const [answer, setAnswer] = useState<{ term: string; groups: SearchGroup[] } | null>(null);
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const show = useCallback((initial = "") => {
    setQ(initial);
    setAnswer(null);
    setActive(0);
    setRecent(recentSearches());
    setOpen(true);
    // who is searching — the API answers an empty query with the scope only
    searchRemote("").then(r => { if (r) setScope(r.scope); }).catch(() => {});
  }, []);

  // ⌘K / Ctrl+K toggles, and search buttons send the open event
  const openRef = useRef(false);
  useEffect(() => { openRef.current = open; }, [open]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (openRef.current) setOpen(false);
        else show();
      }
    };
    const onOpen = (e: Event) => show(String((e as CustomEvent).detail ?? ""));
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_SEARCH_EVENT, onOpen);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener(OPEN_SEARCH_EVENT, onOpen); };
  }, [show]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  // as you type: debounce, cancel the previous request
  const term = q.trim();
  useEffect(() => {
    if (!open || term.length < 2) return;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const t = setTimeout(() => {
      searchRemote(term, { limit: 5, signal: ctrl.signal })
        .then(r => {
          if (ctrl.signal.aborted) return;
          if (r) setScope(r.scope);
          setAnswer({ term, groups: r?.groups ?? [] });
        })
        .catch(() => { if (!ctrl.signal.aborted) setAnswer({ term, groups: [] }); });
    }, 180);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [term, open]);
  const remote = answer?.term === term ? answer.groups : undefined;
  const loading = term.length >= 2 && remote === undefined;

  const groups = useMemo(
    () => (q.trim().length >= 2 ? mergeGroups(localGroups(q, scope, arabic), remote) : []),
    [q, scope, arabic, remote],
  );
  const flat = useMemo(() => groups.flatMap(g => g.hits), [groups]);

  const close = () => { setOpen(false); abortRef.current?.abort(); };
  const go = (href: string) => {
    rememberSearch(q);
    close();
    router.push(href);
  };
  const seeAll = () => go(`/search?q=${encodeURIComponent(q.trim())}`);

  const onKeyDown = (e: React.KeyboardEvent) => {
    // keep canvas shortcuts (WASD, Delete …) from firing while typing
    e.stopPropagation();
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => Math.min(a + 1, Math.max(0, flat.length - 1))); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => Math.max(0, a - 1)); return; }
    if (e.key === "Enter") {
      e.preventDefault();
      const hit = flat[active];
      if (hit) go(hitHref(hit, scope));
      else if (q.trim().length >= 2) seeAll();
    }
  };

  if (!open) return null;
  let idx = -1;

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-start justify-center bg-[rgba(16,18,18,0.35)] px-4 pt-[10vh] backdrop-blur-[2px]"
      onMouseDown={e => { if (e.target === e.currentTarget) close(); }}
      onKeyDown={onKeyDown}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div role="dialog" aria-modal="true" aria-label={arabic ? "البحث" : "Search Nooi"}
        className="w-full max-w-[620px] overflow-hidden rounded-[18px] border border-[#E6EBEA] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
        <div className="flex items-center gap-2.5 border-b border-[#EEF1F0] px-4 py-3">
          {loading ? <Loader2 size={17} className="animate-spin text-[#8E9493]" /> : <Search size={17} className="text-[#8E9493]" />}
          <input
            ref={inputRef}
            value={q}
            onChange={e => { setQ(e.target.value); setActive(0); }}
            placeholder={arabic
              ? "ابحث في المنتجات والموردين والطلبات والمشاريع…"
              : scope === "admin" ? "Search products, vendors, orders, invoices, tickets…"
                : scope === "vendor" ? "Search your listings, orders, customers…"
                  : "Search products, vendors, your projects and orders…"}
            className="min-w-0 flex-1 bg-transparent text-[15px] text-[#101212] placeholder:text-[#B3B9B9] focus:outline-none"
            aria-label={arabic ? "البحث" : "Search"}
          />
          {q && (
            <button type="button" onClick={() => { setQ(""); inputRef.current?.focus(); }} className="rounded-full p-1 text-[#8E9493] hover:bg-[#F1F4F4]" aria-label="Clear">
              <X size={14} />
            </button>
          )}
          <kbd className="hidden rounded-md border border-[#E6EBEA] px-1.5 py-0.5 text-[10.5px] text-[#8E9493] sm:inline">Esc</kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {term.length < 2 ? (
            recent.length ? (
              <div>
                <div className="px-2.5 pb-1 pt-1.5 text-[10.5px] font-medium uppercase tracking-wide text-[#8E9493]">{arabic ? "عمليات بحث سابقة" : "Recent"}</div>
                {recent.map(r => (
                  <button key={r} type="button" onClick={() => setQ(r)}
                    className="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-start text-[13px] text-[#343837] hover:bg-[#F7F9F9]">
                    <Clock size={14} className="text-[#8E9493]" />{r}
                  </button>
                ))}
              </div>
            ) : (
              <p className="px-3 py-8 text-center text-[12.5px] text-[#8E9493]">
                {arabic ? "اكتب للبحث في كل نوي." : "Type to search everything on Nooi — try “oak”, “factory” or an order number."}
              </p>
            )
          ) : groups.length === 0 ? (
            <p className="px-3 py-8 text-center text-[12.5px] text-[#8E9493]">
              {loading ? (arabic ? "جارٍ البحث…" : "Searching…") : (arabic ? `لا نتائج لـ "${term}"` : `Nothing found for “${term}”. Check the spelling or try fewer words.`)}
            </p>
          ) : (
            groups.map(g => (
              <div key={g.kind} className="mb-1">
                <div className="px-2.5 pb-1 pt-2 text-[10.5px] font-medium uppercase tracking-wide text-[#8E9493]">{KIND_LABEL[g.kind][arabic ? "ar" : "en"]}</div>
                {g.hits.map(h => {
                  idx += 1;
                  const my = idx;
                  return (
                    <HitRow key={`${h.kind}-${h.id}`} hit={h} active={my === active}
                      onHover={() => setActive(my)} onPick={() => go(hitHref(h, scope))} />
                  );
                })}
              </div>
            ))
          )}
        </div>

        {term.length >= 2 && (
          <button type="button" onClick={seeAll}
            className="flex w-full items-center justify-between border-t border-[#EEF1F0] px-4 py-2.5 text-[12.5px] font-medium text-[#004643] hover:bg-[#F7F9F9]">
            <span>{arabic ? `كل النتائج لـ "${term}"` : `See all results for “${term}”`}</span>
            <ArrowRight size={14} className={isRtl ? "rotate-180" : ""} />
          </button>
        )}
      </div>
    </div>
  );
}

/** A search box-looking button that opens the palette. */
export function SearchTrigger({ className = "", label, compact = false }: { className?: string; label?: string; compact?: boolean }) {
  const { language } = useLanguage();
  const text = label ?? (language === "ar" ? "ابحث في نوي" : "Search Nooi");
  const isMac = useSyncExternalStore(
    noop,
    () => /Mac|iPhone|iPad/.test(navigator.platform),
    () => false,
  );
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(OPEN_SEARCH_EVENT, { detail: "" }))}
      aria-label={text}
      title={`${text} (${isMac ? "⌘" : "Ctrl+"}K)`}
      className={compact
        ? `flex h-10 w-10 items-center justify-center rounded-full bg-[#f5f5f5] text-[#0a0a0a] transition-colors hover:bg-[#efefef] ${className}`
        : `flex items-center gap-2 rounded-full border border-[#e2eaf0] bg-white px-3 py-2 text-[13px] text-[#8E9493] transition-colors hover:border-[#87DDD7] ${className}`}
    >
      <Search size={compact ? 17 : 14} />
      {!compact && <><span className="truncate">{text}</span><kbd className="ms-auto rounded border border-[#E6EBEA] px-1 text-[10px]">{isMac ? "⌘K" : "Ctrl K"}</kbd></>}
    </button>
  );
}

const noop = () => () => {};
