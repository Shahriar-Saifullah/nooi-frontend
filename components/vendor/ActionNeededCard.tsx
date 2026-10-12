"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useVendorStore } from "@/lib/store";
import { uploadVendorDocument } from "@/lib/api/vendor";

interface ActionNeededCardProps {
  onStatusChange?: (status: string) => void;
}

export default function ActionNeededCard({ onStatusChange }: ActionNeededCardProps) {
  const router = useRouter();
  const setApplicationStatus = useVendorStore((state) => state.setApplicationStatus);
  const legalDocs = useVendorStore((state) => state.legalDocs);
  const setLegalDocs = useVendorStore((state) => state.setLegalDocs);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    setUploading(true);

    try {
      const res = await uploadVendorDocument(file, "vatRegistrationCertificate");
      if (res.success) {
        setLegalDocs({
          vatRegistrationCertificate: {
            name: file.name,
            size: file.size,
            url: res.data?.url,
          },
        });
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSendToReview = async () => {
    if (!uploadedFile) return;
    setSubmittingReview(true);
    await new Promise((r) => setTimeout(r, 600));
    setApplicationStatus("submitted");
    setSubmittingReview(false);
    if (onStatusChange) {
      onStatusChange("in_review");
    } else {
      router.push("/sell/submitted?status=in_review");
    }
  };

  const hasNewUpload = !!uploadedFile;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "580px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-sans, system-ui, -apple-system, sans-serif)",
      }}
    >
      {/* Action needed status badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "12px",
          fontWeight: 500,
          color: "#B45309",
          marginBottom: "10px",
        }}
      >
        <span
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "9999px",
            backgroundColor: "#D97706",
            display: "inline-block",
            flexShrink: 0,
          }}
        />
        Action needed · 1 document
      </div>

      {/* Main Heading */}
      <h1
        style={{
          fontSize: "24px",
          fontWeight: 700,
          color: "#101212",
          letterSpacing: "-0.015em",
          lineHeight: "1.25",
          margin: "0 0 6px 0",
        }}
      >
        One document needs replacing
      </h1>

      {/* Subtitle */}
      <p
        style={{
          fontSize: "13px",
          lineHeight: "1.45",
          color: "#646968",
          margin: "0 0 24px 0",
        }}
      >
        This isn&apos;t a rejection. Everything else is accepted and your place in the review queue is kept.
      </p>

      {/* Card with delicate amber border */}
      <div
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #FCD34D",
          borderRadius: "14px",
          padding: "26px 28px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
        }}
      >
        {/* Note header */}
        <span
          style={{
            fontSize: "12px",
            color: "#8E9493",
            fontWeight: 400,
            marginBottom: "8px",
          }}
        >
          Note from Nooi review · 27 Sep 2026
        </span>

        {/* Note quote */}
        <p
          style={{
            fontSize: "13px",
            lineHeight: "1.55",
            color: "#101212",
            fontStyle: "italic",
            fontWeight: 500,
            margin: "0 0 20px 0",
          }}
        >
          “Your VAT certificate expired on 12 Aug 2026. Upload the renewed certificate from ZATCA.”
        </p>

        {/* Document box */}
        <div
          style={{
            border: "1px solid #EAEDEC",
            borderRadius: "8px",
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            backgroundColor: "#FFFFFF",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <span
              style={{
                fontSize: "13.5px",
                fontWeight: 600,
                color: "#101212",
              }}
            >
              VAT registration certificate
            </span>
            <span
              style={{
                fontSize: "11.5px",
                color: uploadedFile ? "#004643" : "#8E9493",
                fontWeight: uploadedFile ? 500 : 400,
              }}
            >
              {uploadedFile ? `✓ Ready: ${uploadedFile.name}` : "PDF or JPG, max 10 MB"}
            </span>
          </div>

          <label
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #D5DBDA",
              color: "#004643",
              borderRadius: "6px",
              padding: "7px 16px",
              fontSize: "12.5px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "background-color 0.15s ease",
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F8FAF9")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#FFFFFF")}
          >
            {uploading ? "Uploading..." : uploadedFile ? "Replace" : "Upload"}
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              disabled={uploading}
              style={{ display: "none" }}
            />
          </label>
        </div>

        {/* Send to Nooi review button */}
        <button
          type="button"
          onClick={handleSendToReview}
          disabled={!hasNewUpload || submittingReview || uploading}
          style={{
            alignSelf: "flex-start",
            marginTop: "22px",
            borderRadius: "6px",
            padding: "9px 18px",
            fontSize: "12.5px",
            fontWeight: 500,
            border: "none",
            color: "#FFFFFF",
            backgroundColor: hasNewUpload ? "#004643" : "#8FA89B",
            cursor: hasNewUpload ? "pointer" : "not-allowed",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            if (hasNewUpload) e.currentTarget.style.backgroundColor = "#003836";
          }}
          onMouseLeave={(e) => {
            if (hasNewUpload) e.currentTarget.style.backgroundColor = "#004643";
          }}
        >
          {submittingReview ? "Submitting..." : "Send to Nooi review"}
        </button>
      </div>
    </div>
  );
}
