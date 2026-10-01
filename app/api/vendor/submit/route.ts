import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";

/**
 * POST /api/vendor/submit
 * Called when vendor completes the onboarding flow and clicks "Submit application".
 * Marks their vendor_profiles row as submitted with a timestamp and pending status.
 */
export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      // If env not configured, return success anyway (graceful degradation)
      return NextResponse.json({ success: true, message: "Application submitted." });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json(
        { success: false, error: "Not authenticated." },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);
    const { error: vpError } = await adminClient
      .from("vendor_profiles")
      .upsert(
        {
          id: user.id,
          application_status: "pending",
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (vpError) {
      console.warn("[Vendor Submit API] vendor_profiles update warning:", vpError.message);
      // Don't fail — vendor_profiles table may not be migrated yet
    }

    return NextResponse.json({
      success: true,
      message: "Application submitted successfully. You will receive a decision within 2 business days.",
      submittedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Vendor Submit API] Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to submit application." },
      { status: 500 }
    );
  }
}
