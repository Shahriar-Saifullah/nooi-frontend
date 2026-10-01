import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      commercialRegistrationNumber,
      vatNumber,
      commercialRegistrationCertificate,
      vatRegistrationCertificate,
      authorisedSignatoryId,
    } = body;

    if (!commercialRegistrationNumber || !vatNumber) {
      return NextResponse.json(
        {
          success: false,
          error: "Commercial registration number and VAT number are required.",
        },
        { status: 400 }
      );
    }

    // Persist legal doc data to vendor_profiles table
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceRoleKey) {
      try {
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
                cr_number: commercialRegistrationNumber,
                vat_number: vatNumber,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "id" }
            );

          if (vpError) {
            console.warn("[Vendor Step3 API] vendor_profiles update warning:", vpError.message);
          }
        }
      } catch (dbErr) {
        console.warn("[Vendor Step3 API] DB update warning:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Legal documents submitted successfully.",
      data: {
        commercialRegistrationNumber,
        vatNumber,
        commercialRegistrationCertificate: commercialRegistrationCertificate || null,
        vatRegistrationCertificate: vatRegistrationCertificate || null,
        authorisedSignatoryId: authorisedSignatoryId || null,
        step: 3,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("[Vendor Onboarding Step 3 API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to save legal documents.",
      },
      { status: 500 }
    );
  }
}
