/**
 * Terms documents and their versions — lib/legal/terms.ts
 * ============================================================================
 * Same table as the backend's src/services/terms.service.ts: change a version
 * in BOTH places, and everyone of the affected roles is asked to accept again.
 */

export type TermsRole = "client" | "vendor" | "factory" | "employee";
export type TermsDocument = "terms" | "privacy" | "vendor_agreement" | "employee_policy";

export const TERMS_VERSIONS: Record<TermsDocument, string> = {
  terms: "2026-11-06",
  privacy: "2026-11-06",
  vendor_agreement: "2026-11-06",
  employee_policy: "2026-11-06",
};

export const REQUIRED_BY_ROLE: Record<TermsRole, TermsDocument[]> = {
  client: ["terms", "privacy"],
  vendor: ["terms", "privacy", "vendor_agreement"],
  factory: ["terms", "privacy", "vendor_agreement"],
  employee: ["terms", "privacy", "employee_policy"],
};

export const DOC_SLUG: Record<TermsDocument, string> = {
  terms: "terms",
  privacy: "privacy",
  vendor_agreement: "vendor-agreement",
  employee_policy: "employee-policy",
};

export const DOC_TITLE: Record<TermsDocument, { en: string; ar: string }> = {
  terms: { en: "Terms of Service", ar: "شروط الخدمة" },
  privacy: { en: "Privacy Policy", ar: "سياسة الخصوصية" },
  vendor_agreement: { en: "Vendor & Factory Agreement", ar: "اتفاقية الموردين والمصانع" },
  employee_policy: { en: "Employee Confidentiality & Conduct Policy", ar: "سياسة السرية والسلوك للموظفين" },
};

export const ROLE_LABEL: Record<TermsRole, string> = {
  client: "Client",
  vendor: "Vendor",
  factory: "Factory",
  employee: "Nooi employee",
};

export const docHref = (d: TermsDocument) => `/legal/${DOC_SLUG[d]}`;

export function docFromSlug(slug: string): TermsDocument | null {
  const hit = (Object.entries(DOC_SLUG) as [TermsDocument, string][]).find(([, s]) => s === slug);
  return hit ? hit[0] : null;
}

export interface AcceptanceRow {
  role: string;
  document: string;
  version: string;
  context?: string | null;
  accepted_at?: string;
}

/** Same rule as the backend: the current version, for this role. */
export function missingFor(role: TermsRole, rows: AcceptanceRow[]): TermsDocument[] {
  return REQUIRED_BY_ROLE[role].filter(
    doc => !rows.some(r => r.role === role && r.document === doc && r.version === TERMS_VERSIONS[doc]),
  );
}
