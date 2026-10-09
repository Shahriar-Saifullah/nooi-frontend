import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const documentType = (formData.get("documentType") as string | null) || "trade_licence";

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

    // Map UI doc types to backend kinds
    let kind = "trade_licence";
    if (documentType === "vatRegistrationCertificate" || documentType === "vat_certificate") {
      kind = "vat_certificate";
    } else if (documentType === "authorisedSignatoryId" || documentType === "bank_letter") {
      kind = "bank_letter";
    } else if (documentType === "commercialRegistrationCertificate") {
      kind = "trade_licence";
    } else {
      kind = documentType;
    }

    const extension = file.name.split(".").pop() || "pdf";
    const storagePath = `vendor-documents/${user.id}/${kind}.${extension}`;

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
        label: file.name,
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

