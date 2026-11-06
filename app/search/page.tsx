"use client";

/**
 * Search results — /search?q=…&kind=…
 * Everything the signed-in person may see that matches, grouped by kind,
 * with a filter per kind. Same API and links as the ⌘K palette.
 */

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Loader2, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/lib/i18n/useTranslations";
import {
  KIND_LABEL, hitHref, localGroups, mergeGroups, rememberSearch, searchRemote,
  type SearchGroup, type SearchKind, type SearchScope,
} from "@/lib/search/search";
import { HitRow } from "@/components/search/GlobalSearch";

function Results() {
  const params = useSearchParams();
  const router = useRouter();
  const { language, isRtl } = useLanguage();
  const arabic = language === "ar";
  const q = (params.get("q") ?? "").trim();
  const kind = params.get("kind") as SearchKind | null;
  const [answer, setAnswer] = useState<{ q: string; scope: SearchScope; groups: SearchGroup[] } | null>(null);

  useEffect(() => {
    if (q.length < 2) return;
    let live = true;
    rememberSearch(q);
    searchRemote(q, { limit: 25 }).then(r => {
      if (live) setAnswer({ q, scope: r?.scope ?? "public", groups: r?.groups ?? [] });
    });
    return () => { live = false; };
  }, [q]);

  const ready = answer?.q === q;
  const scope = answer?.scope ?? "public";
  const groups = useMemo(
    () => (q.length >= 2 ? mergeGroups(localGroups(q, scope, arabic), ready ? answer!.groups : []) : []),
    [q, scope, arabic, ready, answer],
  );
  const shown = kind ? groups.filter(g => g.kind === kind) : groups;
  const total = groups.reduce((n, g) => n + g.hits.length, 0);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const t = String(new FormData(e.currentTarget).get("q") ?? "").trim();
    router.push(t ? `/search?q=${encodeURIComponent(t)}` : "/search");
  };
  const kindHref = (k: SearchKind | null) => `/search?q=${encodeURIComponent(q)}${k ? `&kind=${k}` : ""}`;

  return (
    <main className="min-h-screen bg-[#FBFCFC]" dir={isRtl ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-[860px] px-4 py-8 sm:px-6 sm:py-12">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-[12.5px] text-[#646968] hover:text-[#004643]">
          <ArrowLeft size={14} className={isRtl ? "rotate-180" : ""} /> {arabic ? "رجوع" : "Back"}
        </button>

        <form key={q} onSubmit={submit} className="mt-4 flex items-center gap-2.5 rounded-[14px] border border-[#D5DBDA] bg-white px-4 py-3 focus-within:border-[#87DDD7]">
          <Search size={17} className="text-[#8E9493]" />
          <input
            name="q"
            defaultValue={q}
            placeholder={arabic ? "ابحث في نوي" : "Search Nooi"}
            className="min-w-0 flex-1 bg-transparent text-[15px] text-[#101212] focus:outline-none"
            aria-label={arabic ? "البحث" : "Search"}
          />
        </form>

        {q.length < 2 ? (
          <p className="mt-10 text-center text-[13px] text-[#8E9493]">{arabic ? "اكتب حرفين على الأقل." : "Type at least two letters."}</p>
        ) : (
          <>
            <div className="mt-5 flex flex-wrap items-center gap-1.5">
              <Link href={kindHref(null)} className={`rounded-full border px-3 py-1 text-[12px] ${!kind ? "border-[#004643] bg-[#F3FEFD] text-[#004643]" : "border-[#D5DBDA] text-[#343837]"}`}>
                {arabic ? "الكل" : "All"} {ready ? `(${total})` : ""}
              </Link>
              {groups.map(g => (
                <Link key={g.kind} href={kindHref(g.kind)}
                  className={`rounded-full border px-3 py-1 text-[12px] ${kind === g.kind ? "border-[#004643] bg-[#F3FEFD] text-[#004643]" : "border-[#D5DBDA] text-[#343837]"}`}>
                  {KIND_LABEL[g.kind][arabic ? "ar" : "en"]} ({g.hits.length})
                </Link>
              ))}
              {!ready && <Loader2 size={14} className="ms-1 animate-spin text-[#8E9493]" />}
            </div>

            {ready && shown.length === 0 && (
              <p className="mt-10 text-center text-[13px] text-[#8E9493]">
                {arabic ? `لا نتائج لـ "${q}"` : `Nothing found for “${q}”. Check the spelling, try fewer words, or search for a vendor or order number.`}
              </p>
            )}

            <div className="mt-6 flex flex-col gap-6">
              {shown.map(g => (
                <section key={g.kind}>
                  <h2 className="mb-1.5 px-2.5 text-[11px] font-medium uppercase tracking-wide text-[#8E9493]">{KIND_LABEL[g.kind][arabic ? "ar" : "en"]}</h2>
                  <div className="rounded-[14px] border border-[#EAEDEC] bg-white p-1.5">
                    {g.hits.map(h => (
                      <HitRow key={`${h.kind}-${h.id}`} hit={h} active={false} onPick={() => router.push(hitHref(h, scope))} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <Results />
    </Suspense>
  );
}
