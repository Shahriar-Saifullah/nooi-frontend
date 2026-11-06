/**
 * Admin area layout — server component, no UI of its own.
 *
 * Render every admin page per request. As static pages, a page first opened
 * with a query (a reload of /admin/models?id=…, or a notification link) could
 * not navigate back to itself without the query: Next's router silently
 * ignored router.push("/admin/models"), so every "← Back" in the admin was
 * dead after following a notification. Admin pages are private and always
 * show live data, so there is nothing to gain from prerendering them anyway.
 */
import TermsGate from "@/components/legal/TermsGate";

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      {/* Nooi employees accept the terms + employee policy (version-tracked). */}
      <TermsGate context="admin" />
    </>
  );
}
