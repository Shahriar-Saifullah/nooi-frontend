import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";

/**
 * POST /api/vendor/submit
 * Called when vendor completes the onboarding flow and clicks "Submit application".
 * Sets submitted_at timestamp on their vendor_profiles row so admin queue sorts and ages it properly.
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

    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);
    const nowIso = new Date().toISOString();

    // Set submitted_at timestamp (and ensure status is 'pending')
    // business_name and category guard against NOT NULL violations on upsert-as-insert
    const { error: vpError } = await adminClient
      .from("vendor_profiles")
      .upsert(
        {
          id: user.id,
          business_name: user.user_metadata?.business_name || user.email || "",
          category: "general",
          phone: "",
          submitted_at: nowIso,
          updated_at: nowIso,
        },
        { onConflict: "id" }
      );

    if (vpError) {
      console.error("[Vendor Submit API] vendor_profiles update error:", vpError.message);
      return NextResponse.json(
        { success: false, error: `Failed to submit application: ${vpError.message}` },
        { status: 500 }
      );
    }

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

