"use client";

/**
 * On the product page: where it's made, where it ships, and the vendor's
 * certificates and patents.
 */

import React from "react";
import { BadgeCheck, Globe2, MapPin, FileText, ScrollText } from "lucide-react";
import { countryName } from "@/lib/listings/countries";
import type { MarketplaceProduct } from "@/lib/api/marketplace";

const COPY = {
  en: {
    madeInSaudi: "Made in Saudi Arabia",
    madeIn: (c: string) => `Made in ${c}`,
    imported: "Imported",
    shipsTo: "Ships to",
    certificates: "Certificates",
    patents: "Patents & registered designs",
    expires: "valid until",
    expired: "expired",
    view: "View",
    no: "No.",
  },
  ar: {
    madeInSaudi: "صُنع في السعودية",
    madeIn: (c: string) => `صُنع في ${c}`,
    imported: "مستورد",
    shipsTo: "يُشحن إلى",
    certificates: "الشهادات",
    patents: "براءات الاختراع والتصاميم المسجلة",
    expires: "صالحة حتى",
    expired: "منتهية",
    view: "عرض",
    no: "رقم",
  },
};

export default function ProductCredentials({ product, arabic = false }: { product: MarketplaceProduct; arabic?: boolean }) {
  const t = COPY[arabic ? "ar" : "en"];
  const lang = arabic ? "ar" : "en";
  const certs = product.certificates ?? [];
  const patents = product.patents ?? [];
  const ships = product.ships_to?.length ? product.ships_to : ["SA"];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mt-5 flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {product.origin === "saudi" && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#B7ECC8] bg-[#E7FBEB] px-2.5 py-1 text-[11.5px] font-medium text-[#28603A]">
            <MapPin size={12} /> {t.madeInSaudi}
          </span>
        )}
        {product.origin === "international" && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D5DBDA] bg-white px-2.5 py-1 text-[11.5px] font-medium text-[#343837]">
            <Globe2 size={12} /> {product.origin_country ? t.madeIn(countryName(product.origin_country, lang)) : t.imported}
          </span>
        )}
        {certs.length > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#87DDD7] bg-[#F3FEFD] px-2.5 py-1 text-[11.5px] font-medium text-[#004643]">
            <BadgeCheck size={12} /> {certs.length} {t.certificates.toLowerCase()}
          </span>
        )}
      </div>

      <p className="text-[12px] text-[#646968]">
        <span className="text-[#8E9493]">{t.shipsTo}: </span>
        {ships.map(c => countryName(c, lang)).join(arabic ? "، " : ", ")}
      </p>

      {certs.length > 0 && (
        <div>
          <span className="text-[12px] text-[#646968]">{t.certificates}</span>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {certs.map((c, i) => {
              const expired = Boolean(c.expires && c.expires < today);
              return (
                <li key={i} className="flex items-center gap-2 text-[12.5px] text-[#101212]">
                  <FileText size={13} className="shrink-0 text-[#8E9493]" />
                  <span className="min-w-0 truncate">
                    {c.name}
                    {c.issuer && <span className="text-[#8E9493]"> · {c.issuer}</span>}
                    {c.number && <span className="text-[#8E9493]"> · {t.no} {c.number}</span>}
                    {c.expires && (
                      <span className={expired ? "text-[#812F28]" : "text-[#8E9493]"}>
                        {" · "}{expired ? t.expired : `${t.expires} ${c.expires}`}
                      </span>
                    )}
                  </span>
                  {c.url && (
                    <a href={c.url} target="_blank" rel="noreferrer" className="ms-auto shrink-0 text-[12px] font-medium text-[#004643] hover:underline">
                      {t.view}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {patents.length > 0 && (
        <div>
          <span className="text-[12px] text-[#646968]">{t.patents}</span>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {patents.map((p, i) => (
              <li key={i} className="flex items-center gap-2 text-[12.5px] text-[#101212]">
                <ScrollText size={13} className="shrink-0 text-[#8E9493]" />
                <span className="min-w-0 truncate">
                  {p.number}
                  {p.title && <span className="text-[#8E9493]"> · {p.title}</span>}
                  {p.country && <span className="text-[#8E9493]"> · {countryName(p.country, lang)}</span>}
                </span>
                {p.url && (
                  <a href={p.url} target="_blank" rel="noreferrer" className="ms-auto shrink-0 text-[12px] font-medium text-[#004643] hover:underline">
                    {t.view}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
