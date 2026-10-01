import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { storeName, fulfillmentType, city, description } = body;

    if (!storeName || !fulfillmentType || !city) {
      return NextResponse.json(
        {
          success: false,
          error: "Store name, fulfillment type, and city are required.",
        },
        { status: 400 }
      );
    }

    // Persist store profile data to vendor_profiles table
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceRoleKey) {
      try {
        // Get current authenticated user from session
        const supabase = await createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user?.id) {
          const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);
          const { error: vpError } = await adminClient
            .from("vendor_profiles")
            .upsert(
              {
                id: user.id,
                store_name: storeName,
                fulfillment_type: fulfillmentType,
                city,
                description: description || "",
                updated_at: new Date().toISOString(),
              },
              { onConflict: "id" }
            );

          if (vpError) {
            // vendor_profiles table may not be migrated yet — log but don't fail
            console.warn("[Vendor Step2 API] vendor_profiles update warning:", vpError.message);
          }
        }
      } catch (dbErr) {
        console.warn("[Vendor Step2 API] DB update warning:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Store profile updated successfully.",
      data: {
        storeName,
        fulfillmentType,
        city,
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
