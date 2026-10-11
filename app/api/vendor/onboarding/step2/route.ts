import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { resolveVendorUser } from "@/app/api/vendor/_utils/auth";

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
    const {
      storeName,
      businessName,
      fulfillmentType,
      category,
      city,
      country,
      phone,
      website,
      description,
    } = body;

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

    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);

    const { userId } = await resolveVendorUser(req, {
      workEmail: body.workEmail || body.email,
      storeName: storeName || businessName,
      businessName: businessName || storeName,
    });

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Not authenticated. Please sign in." },
        { status: 401 }
      );
    }

    const dbFulfillmentType = normalizeFulfillmentType(fulfillmentType);

    const updatePayload: Record<string, any> = {
      id: userId,
      store_name: storeName.trim(),
      business_name: (businessName || storeName).trim(),
      fulfillment_type: dbFulfillmentType,
      city: city?.trim() || "",
      description: description?.trim() || "",
      updated_at: new Date().toISOString(),
    };

    if (category && typeof category === "string" && category.trim()) {
      updatePayload.category = category.trim();
    } else {
      updatePayload.category = "Furniture";
    }

    if (country && typeof country === "string" && country.trim()) {
      updatePayload.country = country.trim();
    }

    if (phone && typeof phone === "string" && phone.trim()) {
      updatePayload.phone = phone.trim();
    }

    if (website && typeof website === "string" && website.trim()) {
      updatePayload.website = website.trim();
    }

    delete updatePayload.id;

    // 1. First attempt UPDATE on existing row
    const { data: updatedRows, error: updateError } = await adminClient
      .from("vendor_profiles")
      .update(updatePayload)
      .eq("id", userId)
      .select("id");

    if (updateError) {
      console.error("[Vendor Step2 API] DB update error:", updateError.message);
      return NextResponse.json(
        { success: false, error: `Failed to save store profile: ${updateError.message}` },
        { status: 500 }
      );
    }

    // 2. Fallback to upsert if row did not exist yet
    if (!updatedRows || updatedRows.length === 0) {
      const { error: upsertError } = await adminClient
        .from("vendor_profiles")
        .upsert(
          {
            id: userId,
            business_name: (businessName || storeName).trim(),
            phone: phone?.trim() || "",
            ...updatePayload,
          },
          { onConflict: "id" }
        );

      if (upsertError) {
        console.error("[Vendor Step2 API] DB upsert error:", upsertError.message);
        return NextResponse.json(
          { success: false, error: `Failed to save store profile: ${upsertError.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Store profile updated successfully.",
      data: {
        storeName: storeName.trim(),
        fulfillmentType: dbFulfillmentType,
        category: updatePayload.category,
        city: updatePayload.city,
        country: updatePayload.country || "",
        phone: updatePayload.phone || "",
        website: updatePayload.website || "",
        description: updatePayload.description,
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
