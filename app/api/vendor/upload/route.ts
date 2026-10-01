import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const documentType = formData.get("documentType") as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file uploaded." },
        { status: 400 }
      );
    }

    const fileName = file.name;
    const fileSize = file.size;

    return NextResponse.json({
      success: true,
      message: "File uploaded successfully.",
      data: {
        documentType: documentType || "legal_document",
        name: fileName,
        size: fileSize,
        url: `/uploads/vendor/${Date.now()}_${encodeURIComponent(fileName)}`,
        uploadedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("[Vendor Upload API] Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "File upload failed." },
      { status: 500 }
    );
  }
}
