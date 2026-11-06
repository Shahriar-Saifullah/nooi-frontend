import Link from "next/link";
import { notFound } from "next/navigation";
import { DOC_SLUG, DOC_TITLE, TERMS_VERSIONS, docFromSlug, docHref, type TermsDocument } from "@/lib/legal/terms";
import { LEGAL_CONTENT } from "@/lib/legal/content";

export function generateStaticParams() {
  return Object.values(DOC_SLUG).map(doc => ({ doc }));
}

export async function generateMetadata({ params }: { params: Promise<{ doc: string }> }) {
  const doc = docFromSlug((await params).doc);
  return { title: doc ? `${DOC_TITLE[doc].en} · Nooi` : "Nooi" };
}

export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const doc = docFromSlug((await params).doc);
  if (!doc) notFound();
  const sections = LEGAL_CONTENT[doc];

  return (
    <main className="min-h-screen bg-[#FBFCFC]">
      <div className="mx-auto max-w-[760px] px-4 sm:px-6 py-10 sm:py-14">
        <Link href="/" className="text-[12px] text-[#646968] hover:text-[#004643]">Nooi</Link>
        <h1 className="mt-2 text-[28px] leading-tight text-[#101212]">{DOC_TITLE[doc].en}</h1>
        <p className="mt-1 text-[14px] text-[#646968]" dir="rtl" lang="ar">{DOC_TITLE[doc].ar}</p>
        <p className="mt-3 text-[12px] text-[#8E9493]">Version {TERMS_VERSIONS[doc]}</p>

        <div className="mt-8 flex flex-col gap-7">
          {sections.map((s, i) => (
            <section key={s.h}>
              <h2 className="text-[16px] font-medium text-[#101212]">{i + 1}. {s.h}</h2>
              {s.p.map((para, j) => (
                <p key={j} className="mt-2 text-[14px] leading-relaxed text-[#4B4F4F]">{para}</p>
              ))}
            </section>
          ))}
        </div>

        <nav className="mt-12 pt-6 border-t border-[#EAEDEC] flex flex-wrap gap-x-5 gap-y-2 text-[12.5px]">
          {(Object.keys(DOC_SLUG) as TermsDocument[]).filter(d => d !== doc).map(d => (
            <Link key={d} href={docHref(d)} className="text-[#004643] hover:underline">{DOC_TITLE[d].en}</Link>
          ))}
        </nav>
      </div>
    </main>
  );
}
