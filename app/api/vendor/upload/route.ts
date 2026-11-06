import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { resolveVendorUser } from "@/app/api/vendor/_utils/auth";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const uploadType = (formData.get("type") as string | null) || "";
    const assetType = (formData.get("assetType") as string | null) || "";
    const documentType = formData.get("documentType") as string | null;
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

    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);
    const { userId } = await resolveVendorUser(req, { workEmail });

    const fileName = file.name || "upload";
    const extension = fileName.split(".").pop()?.toLowerCase() || "";
    const isGlb = extension === "glb" || file.type.includes("gltf") || assetType === "product_model";
    const isImage = file.type.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "avif", "gif"].includes(extension);
    const isAsset =
      uploadType === "asset" ||
      uploadType === "product_asset" ||
      assetType === "product_image" ||
      assetType === "product_model" ||
      (!documentType && (isGlb || isImage));

    // Certificates (PDF / photo) and store logos: signed-in vendors only,
    // with a type and size check. They're public, like product photos.
    if (assetType === "product_certificate" || assetType === "vendor_logo" || assetType === "option_swatch") {
      if (!userId) {
        return NextResponse.json({ success: false, error: "Not authenticated. Please sign in." }, { status: 401 });
      }
      // logos and option swatches are small images; certificates may be PDFs
      const isLogo = assetType === "vendor_logo" || assetType === "option_swatch";
      const okTypes = isLogo ? ["image/png", "image/jpeg", "image/webp"] : ["application/pdf", "image/png", "image/jpeg"];
      const maxBytes = isLogo ? 2 * 1024 * 1024 : 10 * 1024 * 1024;
      if (!okTypes.includes(file.type)) {
        return NextResponse.json({ success: false, error: isLogo ? "Use a PNG, JPG or WebP image." : "Use a PDF, JPG or PNG file." }, { status: 400 });
      }
      if (file.size > maxBytes) {
        return NextResponse.json({ success: false, error: `The file must be under ${maxBytes / 1024 / 1024} MB.` }, { status: 400 });
      }
      const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
      const folder = assetType === "vendor_logo" ? "logos" : assetType === "option_swatch" ? "swatches" : "certificates";
      const storagePath = `${folder}/${userId}/${Date.now()}-${safeName}`;
      const { error: upErr } = await adminClient.storage
        .from("vendor-assets")
        .upload(storagePath, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
      if (upErr) {
        return NextResponse.json({ success: false, error: `Upload failed: ${upErr.message}` }, { status: 500 });
      }
      const { data: pub } = adminClient.storage.from("vendor-assets").getPublicUrl(storagePath);
      return NextResponse.json({ success: true, url: pub.publicUrl, data: { url: pub.publicUrl, path: storagePath, name: fileName, size: file.size } });
    }

    // ArrayBuffer for Supabase upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // ──────────────────────────────────────────────────────────────────────────
    // 1. PRODUCT ASSETS (Images & 3D GLB Models) -> public vendor-assets bucket
    // ──────────────────────────────────────────────────────────────────────────
    if (isAsset) {
      const bucket = "vendor-assets";
      const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
      const subFolder = isGlb ? "models" : "images";
      const userPrefix = userId || "public";
      const storagePath = `products/${userPrefix}/${subFolder}/${Date.now()}-${sanitizedName}`;

      const contentType =
        file.type || (isGlb ? "model/gltf-binary" : "application/octet-stream");

      const { error: uploadError } = await adminClient.storage
        .from(bucket)
        .upload(storagePath, buffer, {
          contentType,
          upsert: true,
        });

      if (uploadError) {
        console.error("[Vendor Upload API] Asset upload error:", uploadError.message);
        return NextResponse.json(
          { success: false, error: `Asset upload failed: ${uploadError.message}` },
          { status: 500 }
        );
      }

      const { data: publicUrlData } = adminClient.storage
        .from(bucket)
        .getPublicUrl(storagePath);

      const publicUrl = publicUrlData.publicUrl;

      return NextResponse.json({
        success: true,
        url: publicUrl,
        data: {
          url: publicUrl,
          path: storagePath,
          name: fileName,
          size: file.size,
          type: isGlb ? "model" : "image",
        },
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. VENDOR ONBOARDING DOCUMENTS -> private vendor-documents bucket
    // ──────────────────────────────────────────────────────────────────────────
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Not authenticated. Please sign in." },
        { status: 401 }
      );
    }

    const docType = documentType || "trade_licence";
    let kind = "trade_licence";
    let defaultLabel = "Trade licence";

    if (
      docType === "vatRegistrationCertificate" ||
      docType === "vat_certificate" ||
      docType === "vatCertificate"
    ) {
      kind = "vat_certificate";
      defaultLabel = "VAT certificate";
    } else if (
      docType === "authorisedSignatoryId" ||
      docType === "bank_letter" ||
      docType === "bankLetter"
    ) {
      kind = "bank_letter";
      defaultLabel = "Bank letter";
    } else if (
      docType === "commercialRegistrationCertificate" ||
      docType === "trade_licence" ||
      docType === "tradeLicence"
    ) {
      kind = "trade_licence";
      defaultLabel = "Trade licence";
    } else {
      kind = docType;
      defaultLabel = docType;
    }

    const docExt = extension || "pdf";
    const storagePath = `vendor-documents/${userId}/${kind}.${docExt}`;

    const { error: uploadError } = await adminClient.storage
      .from("vendor-documents")
      .upload(storagePath, buffer, {
        contentType: file.type || "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("[Vendor Upload API] Document upload error:", uploadError.message);
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
        name: fileName,
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
