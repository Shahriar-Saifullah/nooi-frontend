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

    // Build legal_documents JSONB array with expected structure: [{ kind, label, path, uploaded_at }]
    const legalDocumentsArray: Array<{ kind: string; label: string; path: string; uploaded_at: string }> = [];

    if (commercialRegistrationCertificate?.path) {
      legalDocumentsArray.push({
        kind: "trade_licence",
        label: commercialRegistrationCertificate.name || "Commercial Registration Certificate",
        path: commercialRegistrationCertificate.path,
        uploaded_at: commercialRegistrationCertificate.uploaded_at || new Date().toISOString(),
      });
    }

    if (vatRegistrationCertificate?.path) {
      legalDocumentsArray.push({
        kind: "vat_certificate",
        label: vatRegistrationCertificate.name || "VAT Registration Certificate",
        path: vatRegistrationCertificate.path,
        uploaded_at: vatRegistrationCertificate.uploaded_at || new Date().toISOString(),
      });
    }

    if (authorisedSignatoryId?.path) {
      legalDocumentsArray.push({
        kind: "bank_letter",
        label: authorisedSignatoryId.name || "Authorised Signatory ID",
        path: authorisedSignatoryId.path,
        uploaded_at: authorisedSignatoryId.uploaded_at || new Date().toISOString(),
      });
    }

    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);

    // Update vendor_profiles table (cr_number, vat_number, legal_documents)
    const { error: vpError } = await adminClient
      .from("vendor_profiles")
      .upsert(
        {
          id: user.id,
          cr_number: commercialRegistrationNumber.trim(),
          vat_number: vatNumber.trim(),
          legal_documents: legalDocumentsArray,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (vpError) {
      console.error("[Vendor Step3 API] DB error:", vpError.message);
      return NextResponse.json(
        { success: false, error: `Failed to save legal documents: ${vpError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Legal documents submitted successfully.",
      data: {
        commercialRegistrationNumber: commercialRegistrationNumber.trim(),
        vatNumber: vatNumber.trim(),
        commercialRegistrationCertificate: commercialRegistrationCertificate || null,
        vatRegistrationCertificate: vatRegistrationCertificate || null,
        authorisedSignatoryId: authorisedSignatoryId || null,
        legalDocuments: legalDocumentsArray,
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

