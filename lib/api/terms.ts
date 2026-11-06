import { requestApi, type ApiResponse } from "./http";
import type { AcceptanceRow, TermsDocument, TermsRole } from "@/lib/legal/terms";

export interface TermsStatus {
  role: TermsRole;
  versions: Record<TermsDocument, string>;
  required: TermsDocument[];
  missing: TermsDocument[];
  accepted: AcceptanceRow[];
}

/** The signed-in account's terms role and what it still has to accept. */
export function getTermsStatus(asClient = false): Promise<ApiResponse<TermsStatus>> {
  return requestApi<TermsStatus>({ path: `/terms/status${asClient ? "?as=client" : ""}`, method: "GET" });
}

/** Accept the current version of these documents (all the role's, if none given). */
export function acceptTerms(opts: { documents?: TermsDocument[]; asClient?: boolean; context: string }) {
  return requestApi<Pick<TermsStatus, "role" | "missing" | "accepted">>({
    path: "/terms/accept",
    method: "POST",
    body: { documents: opts.documents, as: opts.asClient ? "client" : undefined, context: opts.context },
  });
}
