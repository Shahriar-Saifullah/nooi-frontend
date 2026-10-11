import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";

export interface VendorAuthHints {
  workEmail?: string;
  email?: string;
  storeName?: string;
  businessName?: string;
  crNumber?: string;
}

export async function resolveVendorUser(
  req: Request,
  hints: VendorAuthHints = {}
): Promise<{ userId: string | null; businessName?: string; email?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return { userId: null };

  const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);

  // 1. Try session cookies via server Supabase client
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id) {
      return {
        userId: user.id,
        businessName: user.user_metadata?.business_name || user.email || "",
        email: user.email || "",
      };
    }
  } catch {}

  // 2. Try Authorization: Bearer token header
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const token = authHeader.slice(7);
      const { data: tokenUser } = await adminClient.auth.getUser(token);
      if (tokenUser.user?.id) {
        return {
          userId: tokenUser.user.id,
          businessName:
            tokenUser.user.user_metadata?.business_name ||
            tokenUser.user.email ||
            "",
          email: tokenUser.user.email || "",
        };
      }
    } catch {}
  }

  // 3. Fallback: Search by workEmail / email
  const emailToFind = (hints.workEmail || hints.email || "").trim().toLowerCase();
  if (emailToFind) {
    try {
      const { data: userList } = await adminClient.auth.admin.listUsers();
      const matched = userList?.users?.find(
        (u) => u.email?.toLowerCase() === emailToFind
      );
      if (matched?.id) {
        return {
          userId: matched.id,
          businessName:
            matched.user_metadata?.business_name || matched.email || "",
          email: matched.email || "",
        };
      }
    } catch (lookupErr) {
      console.warn("[resolveVendorUser] Email lookup error:", lookupErr);
    }
  }

  // 4. Fallback: Search by CR number if given
  if (hints.crNumber) {
    try {
      const { data: vpRow } = await adminClient
        .from("vendor_profiles")
        .select("id, business_name")
        .eq("cr_number", hints.crNumber.trim())
        .maybeSingle();
      if (vpRow?.id) {
        return {
          userId: vpRow.id,
          businessName: vpRow.business_name || "",
        };
      }
    } catch {}
  }

  // 5. Fallback: Search by store_name or business_name in vendor_profiles
  const nameToFind = (hints.storeName || hints.businessName || "").trim();
  if (nameToFind) {
    try {
      const { data: vpRows } = await adminClient
        .from("vendor_profiles")
        .select("id, business_name, store_name")
        .or(`store_name.ilike.%${nameToFind}%,business_name.ilike.%${nameToFind}%`)
        .limit(1);
      if (vpRows && vpRows.length > 0) {
        return {
          userId: vpRows[0].id,
          businessName: vpRows[0].business_name || "",
        };
      }
    } catch {}
  }

  // 6. Resilient Fallback: Find most recent vendor user registered in the last 24h
  try {
    const { data: userList } = await adminClient.auth.admin.listUsers();
    const vendorUsers = userList?.users
      ?.filter((u) => u.user_metadata?.role === "vendor")
      ?.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

    if (vendorUsers && vendorUsers.length > 0) {
      const latest = vendorUsers[0];
      const createdTime = new Date(latest.created_at).getTime();
      // If created within the last 24 hours
      if (Date.now() - createdTime < 24 * 60 * 60 * 1000) {
        return {
          userId: latest.id,
          businessName:
            latest.user_metadata?.business_name || latest.email || "",
          email: latest.email || "",
        };
      }
    }
  } catch (err) {
    console.warn("[resolveVendorUser] Recent vendor fallback error:", err);
  }

  return { userId: null };
}
