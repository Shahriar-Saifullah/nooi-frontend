import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";

/**
 * Who is calling this vendor route.
 * ----------------------------------------------------------------------------
 * Session cookie, or bearer token. Nothing else.
 *
 * The previous version had six steps. The first two were these; steps 3 to 6
 * identified the caller from the REQUEST BODY — by email, by CR number, by a
 * partial `ilike` match on store name, and finally, with no input at all, by
 * "whichever vendor registered most recently in the last 24 hours".
 *
 * That is not authentication. An unauthenticated request could act as any
 * vendor by naming them:
 *
 *   curl -X POST /api/vendor/listings \
 *     -d '{"title":"x","price":"1","workEmail":"victim@vendor.com"}'
 *
 * — and an empty request would be resolved as the newest vendor. Every live
 * route went through it: creating listings, uploading documents, submitting
 * applications, reading orders.
 *
 * The `hints` parameter is kept so existing call sites compile unchanged. It is
 * ignored, deliberately: deleting the argument everywhere in the same change
 * would make this a large diff over many files and bury the one line that
 * matters. Remove the arguments at leisure.
 *
 * Those fallbacks were presumably added because the session wasn't surviving
 * somewhere — most likely the onboarding redirects. If that recurs, the answer
 * is to pass the access token in an Authorization header (step 2 handles it),
 * never to accept an identity from the body.
 */

export interface VendorAuthHints {
  workEmail?: string;
  email?: string;
  storeName?: string;
  businessName?: string;
  crNumber?: string;
}

export interface VendorAuthResult {
  userId: string | null;
  businessName?: string;
  email?: string;
  /** From profiles.role. Null when there is no authenticated caller. */
  role?: string | null;
}

export async function resolveVendorUser(
  req: Request,
  _hints: VendorAuthHints = {},
): Promise<VendorAuthResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return { userId: null, role: null };

  const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);

  let userId: string | null = null;
  let email = "";

  // 1. Session cookie.
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      userId = user.id;
      email = user.email || "";
    }
  } catch {
    // No session. Fall through to the token.
  }

  // 2. Authorization: Bearer <access token>.
  if (!userId) {
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const { data: tokenUser } = await adminClient.auth.getUser(authHeader.slice(7));
        if (tokenUser.user?.id) {
          userId = tokenUser.user.id;
          email = tokenUser.user.email || "";
        }
      } catch {
        // Invalid or expired token. Still unauthenticated.
      }
    }
  }

  // No credential, no caller. Never a guess.
  if (!userId) return { userId: null, role: null };

  // 3. The role, from profiles — the same column requireAuth reads on the
  //    backend. Not user_metadata, which the user can rewrite from a browser
  //    console with supabase.auth.updateUser({ data: { role: 'vendor' } }).
  const { data: profile, error } = await adminClient
    .from("profiles")
    .select("role, full_name")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    // A failed lookup is not a pass. Treat it as no caller rather than
    // continuing with an unknown role.
    console.error("[resolveVendorUser] profile lookup failed:", error.message);
    return { userId: null, role: null };
  }

  // The business name comes from vendor_profiles, not from metadata — callers
  // use it for display, and metadata drifts from the real row.
  const { data: vendorProfile } = await adminClient
    .from("vendor_profiles")
    .select("business_name, store_name")
    .eq("id", userId)
    .maybeSingle();

  return {
    userId,
    role: profile?.role ?? null,
    email,
    businessName: vendorProfile?.store_name || vendorProfile?.business_name || email,
  };
}

/**
 * For routes that must only serve vendors.
 *
 * resolveVendorUser says who is calling; this says whether they may. An admin
 * reading a vendor route is not obviously wrong, but it should be a decision
 * rather than an accident — so it is excluded here too, and any route that
 * genuinely wants both can check `role` itself.
 */
export async function requireVendorUser(
  req: Request,
  hints: VendorAuthHints = {},
): Promise<VendorAuthResult & { ok: boolean; reason?: string }> {
  const result = await resolveVendorUser(req, hints);

  if (!result.userId) {
    return { ...result, ok: false, reason: "Not authenticated. Please sign in." };
  }
  if (result.role !== "vendor") {
    return { ...result, ok: false, reason: "This account is not registered as a vendor." };
  }
  return { ...result, ok: true };
}