import { NextResponse } from "next/server";
import { notifyUsers, notifyAdmins } from "@/app/api/_lib/notify";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { resolveVendorUser } from "@/app/api/vendor/_utils/auth";

/**
 * POST /api/vendor/submit
 * Called when vendor completes onboarding and clicks "Submit application".
 * Sets submitted_at timestamp and pending status on their vendor_profiles row.
 */
export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: "Supabase service role credentials not configured." },
        { status: 500 }
      );
    }

    let payload: Record<string, any> = {};
    try {
      payload = await req.json();
    } catch {}

    const { userId } = await resolveVendorUser(req, payload);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Not authenticated. Please sign in." },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);
    const nowIso = new Date().toISOString();

    const updatePayload: Record<string, any> = {
      id: userId,
      submitted_at: nowIso,
      status: "pending",
      updated_at: nowIso,
    };

    // payout_connected is NOT set here. It means "Nooi has verified this
    // vendor's IBAN" and only the admin verify endpoint may set it.

    if (payload.taxId && typeof payload.taxId === "string" && payload.taxId.trim()) {
      updatePayload.tax_id = payload.taxId.trim();
    }

    if (payload.registeredAddress && typeof payload.registeredAddress === "string" && payload.registeredAddress.trim()) {
      updatePayload.address = payload.registeredAddress.trim();
    } else if (payload.address && typeof payload.address === "string" && payload.address.trim()) {
      updatePayload.address = payload.address.trim();
    }

    if (payload.website && typeof payload.website === "string" && payload.website.trim()) {
      updatePayload.website = payload.website.trim();
    }

    if (payload.phone && typeof payload.phone === "string" && payload.phone.trim()) {
      updatePayload.phone = payload.phone.trim();
    }

    if (payload.category && typeof payload.category === "string" && payload.category.trim()) {
      updatePayload.category = payload.category.trim();
    }

    if (payload.city && typeof payload.city === "string" && payload.city.trim()) {
      updatePayload.city = payload.city.trim();
    }

    if (payload.country && typeof payload.country === "string" && payload.country.trim()) {
      updatePayload.country = payload.country.trim();
    }

    if (payload.description && typeof payload.description === "string" && payload.description.trim()) {
      updatePayload.description = payload.description.trim();
    }

    if (payload.storeName && typeof payload.storeName === "string" && payload.storeName.trim()) {
      updatePayload.store_name = payload.storeName.trim();
    }

    delete updatePayload.id;

    // 1. First attempt an UPDATE on existing row
    const { data: updatedRows, error: updateError } = await adminClient
      .from("vendor_profiles")
      .update(updatePayload)
      .eq("id", userId)
      .select("id");

    if (updateError) {
      console.error("[Vendor Submit API] vendor_profiles update error:", updateError.message);
      return NextResponse.json(
        { success: false, error: `Failed to submit application: ${updateError.message}` },
        { status: 500 }
      );
    }

    // 2. If row did not exist yet, fallback to upsert with required NOT NULL columns
    if (!updatedRows || updatedRows.length === 0) {
      const fallbackBusiness =
        payload.businessName ||
        payload.storeName ||
        "Vendor Business";

      const { error: upsertError } = await adminClient
        .from("vendor_profiles")
        .upsert(
          {
            id: userId,
            business_name: fallbackBusiness,
            store_name: payload.storeName || fallbackBusiness,
            phone: payload.phone || "",
            category: payload.category || "Furniture",
            ...updatePayload,
          },
          { onConflict: "id" }
        );

      if (upsertError) {
        console.error("[Vendor Submit API] vendor_profiles upsert error:", upsertError.message);
        return NextResponse.json(
          { success: false, error: `Failed to submit application: ${upsertError.message}` },
          { status: 500 }
        );
      }
    }

    // The vendor gets a receipt; Nooi's team gets the application to review.
    const storeLabel = payload.storeName || payload.businessName || "A new vendor";
    await notifyUsers(adminClient, [userId], {
      title: "Application received",
      message: "Thanks — Nooi is reviewing your application. You'll hear back here within 2 business days.",
      type: "vendor_approval",
      link: "/sell/submitted",
    });
    await notifyAdmins(adminClient, {
      title: "New vendor application",
      message: `${storeLabel} applied to sell on Nooi.`,
      type: "admin",
      link: `/admin/applications?id=${userId}`,
    });

    return NextResponse.json({
      success: true,
      message: "Application submitted successfully. You will receive a decision within 2 business days.",
      submittedAt: nowIso,
    });
  } catch (error: any) {
    console.error("[Vendor Submit API] Exception:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to submit application." },
      { status: 500 }
    );
  }
}
