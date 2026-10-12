import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { resolveVendorUser } from "@/app/api/vendor/_utils/auth";

async function handleGetStatus(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: "Supabase credentials not configured." },
        { status: 500 }
      );
    }

    let hints: Record<string, string> = {};
    if (req.method === "POST") {
      try {
        hints = await req.json();
      } catch {}
    } else {
      const url = new URL(req.url);
      const email = url.searchParams.get("email");
      const businessName = url.searchParams.get("businessName");
      if (email) hints.workEmail = email;
      if (businessName) hints.businessName = businessName;
    }

    const { userId } = await resolveVendorUser(req, hints);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Not authenticated. Please sign in." },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);

    const { data: vpRow, error: vpErr } = await adminClient
      .from("vendor_profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (vpErr) {
      console.error("[Vendor Status API] DB error:", vpErr.message);
      return NextResponse.json(
        { success: false, error: `Failed to retrieve vendor profile: ${vpErr.message}` },
        { status: 500 }
      );
    }

    if (!vpRow) {
      return NextResponse.json(
        { success: false, error: "Vendor profile does not exist yet." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        vendor: {
          id: vpRow.id,
          business_name: vpRow.business_name || "",
          store_name: vpRow.store_name || vpRow.business_name || "",
          business_email: vpRow.business_email || "",
          phone: vpRow.phone || "",
          category: vpRow.category || "Furniture",
          city: vpRow.city || "",
          country: vpRow.country || "",
          fulfillment_type: vpRow.fulfillment_type || "factory",
          status: vpRow.status || (vpRow.submitted_at ? "pending" : "draft"),
          submitted_at: vpRow.submitted_at || null,
          created_at: vpRow.created_at || "",
          decided_at: vpRow.decided_at || null,
          verified_at: vpRow.verified_at || null,
          rejection_reason: vpRow.rejection_reason || null,
          description: vpRow.description || "",
          website: vpRow.website || null,
          address: vpRow.address || null,
          tax_id: vpRow.tax_id || null,
          cr_number: vpRow.cr_number || null,
          vat_number: vpRow.vat_number || null,
          payout_connected: Boolean(vpRow.payout_connected),
          legal_documents: Array.isArray(vpRow.legal_documents) ? vpRow.legal_documents : [],
        },
      },
    });
  } catch (error: any) {
    console.error("[Vendor Status API] Exception:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  return handleGetStatus(req);
}

export async function POST(req: Request) {
  return handleGetStatus(req);
}
