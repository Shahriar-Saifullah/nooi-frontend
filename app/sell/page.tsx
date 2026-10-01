"useClient";
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useVendorStore } from "@/lib/store";
import { signUpVendor } from "@/lib/api/vendor";

function getStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;
  if (!password) return { score: 0, label: "", color: "#D1D5DB" };
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: "Weak", color: "#ef4444" };
  if (score === 2) return { score: 2, label: "Fair", color: "#f97316" };
  if (score === 3) return { score: 3, label: "Good", color: "#ca8a04" };
  return { score: 4, label: "Strong", color: "#044E43" };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function VendorSignupPage() {
  const router = useRouter();
  const accountData = useVendorStore((state) => state.accountData);
  const setAccountData = useVendorStore((state) => state.setAccountData);
  const setStep = useVendorStore((state) => state.setStep);
  const resetVendorState = useVendorStore((state) => state.resetVendorState);

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    fullName?: string;
    workEmail?: string;
    businessName?: string;
    password?: string;
    form?: string;
  }>({});

  useEffect(() => {
    resetVendorState();
  }, [resetVendorState]);

  const strength = getStrength(accountData.password || "");

  const validate = () => {
    const next: typeof errors = {};
    if (!accountData.fullName.trim()) next.fullName = "Full name is required";
    if (!accountData.workEmail.trim()) next.workEmail = "Work email is required";
    else if (!EMAIL_REGEX.test(accountData.workEmail))
      next.workEmail = "Please enter a valid work email";
    if (!accountData.businessName.trim())
      next.businessName = "Business name is required";
    if (!accountData.password) next.password = "Password is required";
    else if (accountData.password.length < 8)
      next.password = "Password must be at least 8 characters";
    return next;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    setErrors({});

    const res = await signUpVendor({
      fullName: accountData.fullName,
      workEmail: accountData.workEmail,
      businessName: accountData.businessName,
      password: accountData.password,
    });

    setSubmitting(false);

    if (!res.success) {
      setErrors({ form: typeof res.error === "string" ? res.error : "Vendor signup failed." });
      return;
    }

    setStep(1.5);
    router.push(`/sell/verify-email?email=${encodeURIComponent(accountData.workEmail)}`);
  };

  return (
    <div className="flex min-h-screen overflow-hidden bg-white">
      {/* Left panel */}
      <div className="hidden md:flex w-115 bg-[#F3FEFD] flex-col justify-between p-12 overflow-y-auto border-r border-gray-100">
        <div>
          <a href="/">
            <img src="/Logo/Logo.svg" alt="nooi" className="h-7" />
          </a>
        </div>

        <div className="mb-16">
          <h2 className="text-4xl italic font-serif text-gray-900 mb-4 leading-tight font-instrument">
            Put your furniture in
            <br />
            real rooms.
          </h2>
          <p className="text-gray-600 text-sm leading-relaxed max-w-sm">
            Shoppers place your products in their 3D designs and buy exactly what they see.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col px-6 md:px-16 py-10 overflow-y-auto">
        <div className="max-w-md mx-auto w-full my-auto py-6">
          

          {/* Heading */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">
              Become a Nooi vendor
            </h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              Create your account, then tell us about your store. Review takes up to 2 business days.
            </p>
          </div>

          {errors.form && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-lg mb-4">
              {typeof errors.form === "string" && errors.form.includes("<!DOCTYPE")
                ? "Sign up failed. Please check your credentials and try again."
                : errors.form}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Full name
              </label>
              <input
                type="text"
                placeholder="Rawda Al-Harbi"
                value={accountData.fullName}
                onChange={(e) => {
                  setAccountData({ fullName: e.target.value });
                  if (errors.fullName) setErrors((p) => ({ ...p, fullName: undefined }));
                }}
                className={`w-full px-3.5 py-2.5 border rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 ${
                  errors.fullName
                    ? "border-red-400 focus:ring-red-300"
                    : "border-gray-300 focus:border-[#044E43] focus:ring-[#044E43]/20"
                }`}
              />
              {errors.fullName && (
                <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>
              )}
            </div>

            {/* Work Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Work email
              </label>
              <input
                type="email"
                placeholder="rawda@atelierrawda.sa"
                value={accountData.workEmail}
                onChange={(e) => {
                  setAccountData({ workEmail: e.target.value });
                  if (errors.workEmail) setErrors((p) => ({ ...p, workEmail: undefined }));
                }}
                className={`w-full px-3.5 py-2.5 border rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 ${
                  errors.workEmail
                    ? "border-red-400 focus:ring-red-300"
                    : "border-gray-300 focus:border-[#044E43] focus:ring-[#044E43]/20"
                }`}
              />
              {errors.workEmail && (
                <p className="text-red-500 text-xs mt-1">{errors.workEmail}</p>
              )}
            </div>

            {/* Business Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Business name
              </label>
              <input
                type="text"
                placeholder="Atelier Rawda"
                value={accountData.businessName}
                onChange={(e) => {
                  setAccountData({ businessName: e.target.value });
                  if (errors.businessName)
                    setErrors((p) => ({ ...p, businessName: undefined }));
                }}
                className={`w-full px-3.5 py-2.5 border rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 ${
                  errors.businessName
                    ? "border-red-400 focus:ring-red-300"
                    : "border-gray-300 focus:border-[#044E43] focus:ring-[#044E43]/20"
                }`}
              />
              {errors.businessName && (
                <p className="text-red-500 text-xs mt-1">{errors.businessName}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••••••••••"
                value={accountData.password || ""}
                onChange={(e) => {
                  setAccountData({ password: e.target.value });
                  if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
                }}
                className={`w-full px-3.5 py-2.5 border rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 ${
                  errors.password
                    ? "border-red-400 focus:ring-red-300"
                    : "border-gray-300 focus:border-[#044E43] focus:ring-[#044E43]/20"
                }`}
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password}</p>
              )}

              {/* Password strength bar */}
              <div className="flex items-center gap-1.5 mt-2.5 mb-1">
                {[1, 2, 3, 4].map((barIndex) => (
                  <div
                    key={barIndex}
                    className="h-1 flex-1 rounded-full transition-colors duration-200"
                    style={{
                      backgroundColor:
                        strength.score >= barIndex ? strength.color : "#E5E7EB",
                    }}
                  />
                ))}
                {strength.label && (
                  <span
                    className="text-xs font-semibold ml-2 min-w-12 text-right transition-colors"
                    style={{ color: strength.color }}
                  >
                    {strength.label}
                  </span>
                )}
              </div>
            </div>

            {/* Vendor Callout Notice Box */}
            <div className="bg-[#EBF7F6] border border-[#C7EFEA] text-[#044E43] rounded-xl p-4 text-xs leading-relaxed font-normal my-5">
              Vendor accounts are reviewed before you can list products. You&apos;ll need your commercial registration and VAT certificate.
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#004643] hover:bg-[#033d34] text-white font-medium py-3 px-4 rounded-lg text-sm transition-colors cursor-pointer shadow-2xs disabled:opacity-70"
            >
              {submitting ? "Creating account..." : "Create account"}
            </button>
          </form>

          {/* Footer links */}
          <div className="text-center mt-6">
            <span className="text-xs text-gray-600">
              Buying or designing?{" "}
              <a
                href="/authpage/signup"
                className="text-[#044E43] font-semibold hover:underline"
              >
                Create a client account
              </a>
            </span>
          </div>

          <div className="text-center mt-3 text-xs text-gray-500">
            By continuing you agree to Nooi&apos;s{" "}
            <a href="#" className="text-gray-700 font-medium hover:underline">
              Vendor terms
            </a>{" "}
            and{" "}
            <a href="#" className="text-gray-700 font-medium hover:underline">
              Privacy policy
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
