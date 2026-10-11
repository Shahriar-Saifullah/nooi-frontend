import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { resolveVendorUser } from "@/app/api/vendor/_utils/auth";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const documentType = (formData.get("documentType") as string | null) || "trade_licence";
    const workEmail = (formData.get("workEmail") as string | null) || undefined;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file uploaded." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: "Supabase storage service credentials not configured." },
        { status: 500 }
      );
    }

    const { userId } = await resolveVendorUser(req, { workEmail });

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Not authenticated. Please sign in." },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);

    // Map UI doc types to backend kinds and labels
    let kind = "trade_licence";
    let defaultLabel = "Trade licence";

    if (
      documentType === "vatRegistrationCertificate" ||
      documentType === "vat_certificate" ||
      documentType === "vatCertificate"
    ) {
      kind = "vat_certificate";
      defaultLabel = "VAT certificate";
    } else if (
      documentType === "authorisedSignatoryId" ||
      documentType === "bank_letter" ||
      documentType === "bankLetter"
    ) {
      kind = "bank_letter";
      defaultLabel = "Bank letter";
    } else if (
      documentType === "commercialRegistrationCertificate" ||
      documentType === "trade_licence" ||
      documentType === "tradeLicence"
    ) {
      kind = "trade_licence";
      defaultLabel = "Trade licence";
    } else {
      kind = documentType;
      defaultLabel = documentType;
    }

    const extension = file.name.split(".").pop() || "pdf";
    const storagePath = `vendor-documents/${userId}/${kind}.${extension}`;

    // ArrayBuffer for Supabase upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to vendor-documents bucket
    const { error: uploadError } = await adminClient.storage
      .from("vendor-documents")
      .upload(storagePath, buffer, {
        contentType: file.type || "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("[Vendor Upload API] Supabase storage upload error:", uploadError.message);
      return NextResponse.json(
        { success: false, error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "File uploaded successfully to vendor-documents bucket.",
      data: {
        kind,
        label: defaultLabel,
        path: storagePath,
        uploaded_at: new Date().toISOString(),
        name: file.name,
        size: file.size,
      },
    });
  } catch (error: any) {
    console.error("[Vendor Upload API] Exception:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "File upload failed." },
      { status: 500 }
    );
  }
}
