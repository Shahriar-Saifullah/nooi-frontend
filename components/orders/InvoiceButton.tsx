"use client";

import React, { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { downloadInvoice } from "@/lib/api/documents";

/** "Tax invoice (PDF)" on the order page. The invoice is issued on first click. */
export default function InvoiceButton({ orderId, arabic = false }: { orderId: string; arabic?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const go = async () => {
    setBusy(true);
    setError("");
    const err = await downloadInvoice(orderId);
    setBusy(false);
    if (err) setError(err);
  };

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={go}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-full border border-[#D5DBDA] bg-white px-3 py-1.5 text-[12px] font-medium text-[#343837] transition-colors hover:border-[#004643] hover:text-[#004643] disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        {arabic ? "الفاتورة الضريبية (PDF)" : "Tax invoice (PDF)"}
      </button>
      {error && <span className="max-w-[320px] text-[11.5px] text-[#812F28]">{error}</span>}
    </span>
  );
}
