import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";

function normalizeFulfillmentType(val: string): string {
  const lower = (val || "").toLowerCase();
  if (lower.includes("factory")) return "factory";
  if (lower.includes("warehouse") || lower.includes("retailer")) return "warehouse";
  if (lower.includes("dropship")) return "dropship";
  if (lower.includes("studio") || lower.includes("hybrid")) return "studio";
  return "factory"; // fallback
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { storeName, businessName, fulfillmentType, city, phone, description } = body;

    if (!storeName || !fulfillmentType) {
      return NextResponse.json(
        {
          success: false,
          error: "Store name and fulfillment type are required.",
        },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: "Supabase service role credentials not configured." },
        { status: 500 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json(
        { success: false, error: "Not authenticated. Please sign in." },
        { status: 401 }
      );
    }

    const dbFulfillmentType = normalizeFulfillmentType(fulfillmentType);
    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);

    // Update vendor_profiles table (DO NOT include status or revoked columns)
    // business_name and category are included to satisfy NOT NULL constraints
    // in case the row doesn't exist yet (upsert would INSERT, not UPDATE)
    const { error: vpError } = await adminClient
      .from("vendor_profiles")
      .upsert(
        {
          id: user.id,
          store_name: storeName.trim(),
          business_name: (businessName || storeName).trim(),
          category: "general",
          fulfillment_type: dbFulfillmentType,
          city: city?.trim() || "",
          description: description?.trim() || "",
          ...(phone ? { phone: phone.trim() } : {}),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (vpError) {
      console.error("[Vendor Step2 API] DB error:", vpError.message);
      return NextResponse.json(
        { success: false, error: `Failed to save store profile: ${vpError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Store profile updated successfully.",
      data: {
        storeName: storeName.trim(),
        fulfillmentType: dbFulfillmentType,
        city: city || "",
        description: description || "",
        step: 2,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("[Vendor Onboarding Step 2 API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to update store profile.",
      },
      { status: 500 }
    );
  }
}

