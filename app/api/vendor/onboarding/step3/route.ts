import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { resolveVendorUser } from "@/app/api/vendor/_utils/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      commercialRegistrationNumber,
      vatNumber,
      taxId,
      registeredAddress,
      commercialRegistrationCertificate,
      vatRegistrationCertificate,
      bankLetter,
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

    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);

    const { userId, businessName: resolvedBusiness } = await resolveVendorUser(req, {
      workEmail: body.workEmail || body.email,
      businessName: body.businessName,
      crNumber: commercialRegistrationNumber,
    });

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Not authenticated. Please sign in." },
        { status: 401 }
      );
    }

    // Build legal_documents JSONB array with expected structure: [{ kind, label, path, uploaded_at }]
    const legalDocumentsArray: Array<{ kind: string; label: string; path: string; uploaded_at: string }> = [];

    const tradeDoc = commercialRegistrationCertificate || body.tradeLicence;
    if (tradeDoc?.path) {
      legalDocumentsArray.push({
        kind: "trade_licence",
        label: "Trade licence",
        path: tradeDoc.path,
        uploaded_at: tradeDoc.uploaded_at || new Date().toISOString(),
      });
    }

    const vatDoc = vatRegistrationCertificate || body.vatCertificate;
    if (vatDoc?.path) {
      legalDocumentsArray.push({
        kind: "vat_certificate",
        label: "VAT certificate",
        path: vatDoc.path,
        uploaded_at: vatDoc.uploaded_at || new Date().toISOString(),
      });
    }

    const bankDoc = bankLetter || authorisedSignatoryId;
    if (bankDoc?.path) {
      legalDocumentsArray.push({
        kind: "bank_letter",
        label: "Bank letter",
        path: bankDoc.path,
        uploaded_at: bankDoc.uploaded_at || new Date().toISOString(),
      });
    }

    const updatePayload: Record<string, any> = {
      cr_number: commercialRegistrationNumber.trim(),
      vat_number: vatNumber.trim(),
      legal_documents: legalDocumentsArray,
      updated_at: new Date().toISOString(),
    };

    if (taxId && typeof taxId === "string" && taxId.trim()) {
      updatePayload.tax_id = taxId.trim();
    }

    if (registeredAddress && typeof registeredAddress === "string" && registeredAddress.trim()) {
      updatePayload.address = registeredAddress.trim();
    }

    // 1. First, attempt an UPDATE on the existing vendor_profiles row
    // UPDATE only touches the specified fields and never violates NOT NULL constraints on other columns
    const { data: updatedRows, error: updateError } = await adminClient
      .from("vendor_profiles")
      .update(updatePayload)
      .eq("id", userId)
      .select("id");

    if (updateError) {
      console.error("[Vendor Step3 API] Update error:", updateError.message);
      return NextResponse.json(
        { success: false, error: `Failed to save legal documents: ${updateError.message}` },
        { status: 500 }
      );
    }

    // 2. If row did not exist yet (update matched 0 rows), perform UPSERT with all NOT NULL defaults
    if (!updatedRows || updatedRows.length === 0) {
      const fallbackBusiness =
        body.businessName ||
        resolvedBusiness ||
        body.storeName ||
        "Vendor Business";

      const { error: upsertError } = await adminClient
        .from("vendor_profiles")
        .upsert(
          {
            id: userId,
            business_name: fallbackBusiness,
            store_name: body.storeName || fallbackBusiness,
            phone: body.phone || "",
            category: body.category || "Furniture",
            status: "pending",
            ...updatePayload,
          },
          { onConflict: "id" }
        );

      if (upsertError) {
        console.error("[Vendor Step3 API] Upsert error:", upsertError.message);
        return NextResponse.json(
          { success: false, error: `Failed to save legal documents: ${upsertError.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Legal documents submitted successfully.",
      data: {
        commercialRegistrationNumber: commercialRegistrationNumber.trim(),
        vatNumber: vatNumber.trim(),
        taxId: updatePayload.tax_id || null,
        registeredAddress: updatePayload.address || null,
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
        error: error?.message || "Failed to submit legal documents.",
      },
      { status: 500 }
    );
  }
}
