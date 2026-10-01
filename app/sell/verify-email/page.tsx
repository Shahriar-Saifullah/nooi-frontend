"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useVendorStore } from "@/lib/store";
import { resendVerification } from "@/lib/api/auth";

function VerifyEmailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountData = useVendorStore((state) => state.accountData);
  const setEmailVerified = useVendorStore((state) => state.setEmailVerified);
  const setStep = useVendorStore((state) => state.setStep);

  const emailParam = searchParams.get("email");
  const email = emailParam || accountData.workEmail || "rawda@atelierrawda.sa";

  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const handleVerifiedClick = () => {
    setEmailVerified(true);
    setStep(2);
    router.push("/sell/onboarding?step=2");
  };

  const handleResend = async () => {
    setResending(true);
    setResendMessage(null);
    const res = await resendVerification({ email });
    setResending(false);
    if (res.success) {
      setResendMessage("Verification email resent successfully!");
    } else {
      setResendMessage(typeof res.error === "string" ? res.error : "Failed to resend email.");
    }
  };

  const handleChangeEmail = () => {
    router.push("/sell");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="max-w-md w-full bg-white border border-gray-100 shadow-2xs rounded-2xl p-8">
        {/* Envelope Icon */}
        <div className="w-10 h-10 rounded-lg bg-[#EBF7F6] border border-[#C7EFEA] text-[#044E43] flex items-center justify-center mb-5">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>

        {/* Title & Body */}
        <h1 className="text-xl font-bold text-gray-900 mb-2">Check your email</h1>
        <p className="text-sm text-gray-600 leading-relaxed mb-6">
          We sent a verification link to{" "}
          <strong className="text-gray-900 font-semibold">{email}</strong>. The link
          expires in 24 hours.
        </p>

        {resendMessage && (
          <div className="mb-4 text-xs p-2.5 bg-teal-50 border border-teal-200 text-[#044E43] rounded-lg">
            {resendMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
          <button
            type="button"
            onClick={handleVerifiedClick}
            className="w-full sm:w-auto flex-1 bg-[#004643] hover:bg-[#004643] text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors cursor-pointer text-center"
          >
            I&apos;ve verified my email
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="w-full sm:w-auto flex-1 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 font-medium py-2.5 px-4 rounded-lg text-sm transition-colors cursor-pointer text-center disabled:opacity-60"
          >
            {resending ? "Sending..." : "Resend email"}
          </button>
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-500">
          Wrong address?{" "}
          <button
            type="button"
            onClick={handleChangeEmail}
            className="text-[#044E43] font-semibold underline bg-transparent border-none p-0 cursor-pointer"
          >
            Change email
          </button>
        </p>
      </div>
    </div>
  );
}

export default function VendorVerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailInner />
    </Suspense>
  );
}
