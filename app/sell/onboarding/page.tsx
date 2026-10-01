"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useVendorStore,
  type FulfillmentType,
  type UploadedFile,
} from "@/lib/store";
import {
  saveVendorStoreProfile,
  saveVendorLegalDocs,
  uploadVendorDocument,
} from "@/lib/api/vendor";

function VendorOnboardingInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const stepFromQuery = Number(searchParams.get("step")) || 2;

  const setStep = useVendorStore((state) => state.setStep);
  const accountData = useVendorStore((state) => state.accountData);
  const storeProfile = useVendorStore((state) => state.storeProfile);
  const setStoreProfile = useVendorStore((state) => state.setStoreProfile);
  const legalDocs = useVendorStore((state) => state.legalDocs);
  const setLegalDocs = useVendorStore((state) => state.setLegalDocs);
  const stripeConnected = useVendorStore((state) => state.stripeConnected);
  const setStripeConnected = useVendorStore((state) => state.setStripeConnected);
  const setSubmittedAt = useVendorStore((state) => state.setSubmittedAt);

  const [currentStep, setCurrentStepState] = useState<number>(stepFromQuery);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);

  useEffect(() => {
    useVendorStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (stepFromQuery && stepFromQuery !== currentStep) {
      setCurrentStepState(stepFromQuery);
      setStep(stepFromQuery);
    }
  }, [stepFromQuery, currentStep, setStep]);

  const handleStepChange = (newStep: number) => {
    setCurrentStepState(newStep);
    setStep(newStep);
    router.push(`/sell/onboarding?step=${newStep}`);
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!storeProfile.storeName.trim()) { setErrorMessage("Please enter your store name."); return; }
    if (!storeProfile.fulfillmentType) { setErrorMessage("Please select how you fulfill orders."); return; }
    if (!storeProfile.city.trim()) { setErrorMessage("Please enter your city."); return; }
    setSubmitting(true);
    const res = await saveVendorStoreProfile(storeProfile);
    setSubmitting(false);
    if (!res.success) { setErrorMessage(typeof res.error === "string" ? res.error : "Failed to save store profile."); return; }
    handleStepChange(3);
  };

  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!legalDocs.commercialRegistrationNumber.trim()) { setErrorMessage("Please enter your commercial registration number."); return; }
    if (!legalDocs.vatNumber.trim()) { setErrorMessage("Please enter your VAT number."); return; }
    setSubmitting(true);
    const res = await saveVendorLegalDocs(legalDocs);
    setSubmitting(false);
    if (!res.success) { setErrorMessage(typeof res.error === "string" ? res.error : "Failed to save legal documents."); return; }
    handleStepChange(4);
  };

  const handleConnectStripe = async () => {
    setConnectingStripe(true);
    await new Promise((r) => setTimeout(r, 1400));
    setStripeConnected(true);
    setConnectingStripe(false);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed) return;
    setSubmitting(true);

    // Notify the database that this application has been submitted
    try {
      await fetch("/api/vendor/submit", { method: "POST" });
    } catch {
      // Non-critical — proceed regardless
    }

    setSubmittedAt(new Date().toISOString());
    setStep(5);
    setSubmitting(false);
    router.push("/sell/submitted");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docKey: keyof typeof legalDocs) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(docKey);
    setErrorMessage(null);
    const res = await uploadVendorDocument(file, docKey);
    setUploadingDoc(null);
    if (res.success) {
      const uploadedInfo: UploadedFile = { name: res.data.name || file.name, size: res.data.size || file.size, url: res.data.url };
      setLegalDocs({ [docKey]: uploadedInfo });
    } else {
      setErrorMessage(typeof res.error === "string" ? res.error : "File upload failed.");
    }
  };

  const fulfillmentOptions: { type: FulfillmentType; title: string; description: string; leadTime: string }[] = [
    { type: "Retailer", title: "Retailer", description: "Ships from existing stock", leadTime: "1-5 days" },
    { type: "Factory", title: "Factory", description: "Makes to order in production runs", leadTime: "2-12 weeks" },
    { type: "Hybrid", title: "Hybrid", description: "Stock first, then production", leadTime: "Split per item" },
    { type: "Dropshipper", title: "Dropshipper", description: "Ships from a third-party warehouse", leadTime: "Variable" },
  ];

  const isStep3Valid = legalDocs.commercialRegistrationNumber.trim().length > 0 && legalDocs.vatNumber.trim().length > 0;

  const progressPercentage = currentStep === 2 ? 40 : currentStep === 3 ? 60 : currentStep === 4 ? 80 : currentStep === 5 ? 100 : 20;

  const STEPS = ["Account", "Store profile", "Legal documents", "Payout details", "Review & submit"];

  return (
    <div className="flex h-screen bg-white overflow-hidden font-sans">
      <aside className="w-[300px] bg-[#F3FEFD] border-r border-[#EAEDEC] flex flex-col justify-between shrink-0 overflow-y-auto" style={{ padding: "40px 32px" }}>
        <div className="flex flex-col gap-10">
          <a href="/" className="self-start"><img src="/Logo/Logo.svg" alt="Nooi" className="h-6 w-auto" /></a>
          <div className="flex flex-col gap-1">
            <span className="text-[12px] font-semibold text-[#646968]">Vendor application</span>
            <span className="text-[18px] font-semibold text-[#101212] truncate">{storeProfile.storeName || accountData.businessName || "Atelier Rawda"}</span>
          </div>
          <nav className="flex flex-col gap-5">
            {STEPS.map((label, i) => {
              const n = i + 1;
              const done = n < currentStep;
              const active = n === currentStep;
              return (
                <div key={label} className="flex items-center gap-3">
                  <div className={["w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold shrink-0 transition-colors", done ? "bg-[#004643] text-white border-[1.5px] border-[#004643]" : active ? "bg-white text-[#004643] border-[1.5px] border-[#004643]" : "bg-transparent text-[#8E9493] border-[1.5px] border-[#B3B9B9]"].join(" ")}>
                    {done ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" fill="none" className="w-3.5 h-3.5">
                        <path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : n}
                  </div>
                  <span className={["text-[14px]", active ? "font-semibold text-[#101212]" : done ? "font-normal text-[#343837]" : "font-normal text-[#8E9493]"].join(" ")}>{label}</span>
                </div>
              );
            })}
          </nav>
        </div>
        <p className="text-[12px] text-[#646968] leading-relaxed mt-auto">Questions? <a href="#" className="text-[#004643] font-semibold hover:underline">Vendor support</a> replies within 1 business day.</p>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="sticky top-0 bg-white z-10 border-b border-[#EAEDEC]">
          <div className="flex items-center justify-between gap-3 px-6 py-4">
            <span className="text-[13px] text-[#646968]">Step {currentStep} of 5</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[12px] text-[#28603A]"><span className="w-1.5 h-1.5 rounded-full bg-[#437E54]" />Draft saved</span>
              <button type="button" onClick={() => router.push("/sell")} className="bg-transparent border border-gray-300 rounded-lg px-3 py-1.5 text-[13px] text-[#343837] hover:bg-[#F8FAF9] transition-colors cursor-pointer">Save and exit</button>
            </div>
          </div>
          <div className="h-[5px] bg-[#F1F4F4]"><div className="h-[5px] bg-[#004643] transition-all duration-300" style={{ width: `${progressPercentage}%` }} /></div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[560px] mx-auto flex flex-col gap-6 mt-10 sm:mt-14 pb-16 px-6">
            {errorMessage && <div className="p-4 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg">{errorMessage}</div>}

            {currentStep === 2 && (
              <form onSubmit={handleStep2Submit} className="flex flex-col gap-6">
                <div>
                  <h1 className="text-[26px] font-semibold text-[#101212] mb-1.5 leading-tight">Tell us about your store</h1>
                  <p className="text-[14px] text-[#4B4F4F] m-0">This is what shoppers see on your products.</p>
                </div>
                <label className="flex flex-col gap-1 text-[13px] font-medium text-[#343837]">
                  Store name
                  <input type="text" placeholder="Atelier Rawda" value={storeProfile.storeName || ""} onChange={(e) => setStoreProfile({ storeName: e.target.value })} style={{ borderColor: "#646968" }} className="w-full px-4 py-[12px] border rounded-lg text-[14px] text-[#101212] placeholder:text-[#8E9493] focus:outline-none focus:border-[#004643]" />
                </label>
                <div className="flex flex-col gap-2">
                  <div className="text-[13px] font-medium text-[#343837]">How do you fulfil orders?</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {fulfillmentOptions.map((opt) => {
                      const isSelected = (storeProfile.fulfillmentType || "Factory") === opt.type;
                      return (
                        <button key={opt.type} type="button" onClick={() => setStoreProfile({ fulfillmentType: opt.type })} className={["border rounded-lg p-3 text-left cursor-pointer transition-all flex gap-[10px] items-start", isSelected ? "border-[#004643] bg-[#F3FEFD]" : "border-[#E9EAEC] bg-white hover:border-[#343837]"].join(" ")}>
                          <span className={["w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center shrink-0 mt-[2px]", isSelected ? "border-[#004643]" : "border-gray-300"].join(" ")}><span className={["w-2 h-2 rounded-full", isSelected ? "bg-[#004643]" : "bg-transparent"].join(" ")} /></span>
                          <span className="flex flex-col gap-[2px]">
                            <span className="text-[14px] font-semibold text-[#101212]">{opt.title}</span>
                            <span className="text-[12px] text-[#4B4F4F]">{opt.description}</span>
                            <span className="text-[12px] text-[#646968]">Typical lead time: {opt.leadTime}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="text-[12px] text-[#646968]">This sets whether shoppers see stock counts or lead times, and how your orders are tracked.</div>
                </div>
                <label className="flex flex-col gap-1 text-[13px] font-medium text-[#343837]">
                  City
                  <input type="text" placeholder="Riyadh" value={storeProfile.city || ""} onChange={(e) => setStoreProfile({ city: e.target.value })} style={{ borderColor: "#646968" }} className="w-full px-4 py-[12px] border rounded-lg text-[14px] text-[#101212] placeholder:text-[#646968] focus:outline-none focus:border-[#004643]" />
                </label>
                <label className="flex flex-col gap-1 text-[13px] font-medium text-[#343837]">
                  Short description
                  <textarea rows={3} placeholder="Solid-wood furniture made to order in our Riyadh workshop." value={storeProfile.description || ""} onChange={(e) => setStoreProfile({ description: e.target.value })} style={{ borderColor: "#646968" }} className="w-full px-4 py-[12px] border rounded-lg text-[14px] text-[#101212] placeholder:text-[#8E9493] resize-y focus:outline-none focus:border-[#004643]" />
                </label>
                <div className="flex items-center justify-between gap-3 flex-wrap pt-4 border-t border-gray-300">
                  <button type="button" onClick={() => router.push("/sell/verify-email")} className="bg-transparent border-0 py-2.5 text-[14px] text-[#4B4F4F] hover:text-[#101212] transition-colors cursor-pointer">Back</button>
                  <button type="submit" disabled={submitting} className="bg-[#004643] hover:bg-[#003836] text-white border-0 rounded-lg px-5 py-[12px] text-[15px] font-medium cursor-pointer disabled:opacity-60">{submitting ? "Saving..." : "Continue"}</button>
                </div>
              </form>
            )}

            {currentStep === 3 && (
              <form onSubmit={handleStep3Submit} className="flex flex-col gap-6">
                <div>
                  <h1 className="text-[26px] font-semibold text-[#101212] mb-1.5 leading-tight">Legal documents</h1>
                  <p className="text-[14px] text-[#4B4F4F] m-0">Nooi admin checks these before you can list products.</p>
                </div>
                <label className="flex flex-col gap-1 text-[13px] font-medium text-[#343837]">
                  Commercial registration number
                  <input type="text" placeholder="10 digits" maxLength={10} value={legalDocs.commercialRegistrationNumber} onChange={(e) => setLegalDocs({ commercialRegistrationNumber: e.target.value.replace(/\D/g, "") })} style={{ borderColor: "#646968" }} className="w-full px-4 py-[12px] border rounded-lg text-[14px] text-[#101212] placeholder:text-[#8E9493] focus:outline-none focus:border-[#004643]" />
                </label>
                <label className="flex flex-col gap-1 text-[13px] font-medium text-[#343837]">
                  VAT number
                  <input type="text" placeholder="15 digits" maxLength={15} value={legalDocs.vatNumber} onChange={(e) => setLegalDocs({ vatNumber: e.target.value.replace(/\D/g, "") })} style={{ borderColor: "#646968" }} className="w-full px-4 py-[12px] border rounded-lg text-[14px] text-[#101212] placeholder:text-[#8E9493] focus:outline-none focus:border-[#004643]" />
                </label>
                <div className="flex flex-col gap-2">
                  {[
                    { key: "commercialRegistrationCertificate" as const, label: "Commercial registration certificate", hint: "PDF or JPG, max 10 MB", file: legalDocs.commercialRegistrationCertificate },
                    { key: "vatRegistrationCertificate" as const, label: "VAT registration certificate", hint: "PDF or JPG, max 10 MB", file: legalDocs.vatRegistrationCertificate },
                    { key: "authorisedSignatoryId" as const, label: "Authorised signatory ID", hint: "National ID or Iqama, both sides", file: legalDocs.authorisedSignatoryId },
                  ].map((doc) => (
                    <div key={doc.key} className="border border-gray-300 bg-white rounded-lg p-4 flex items-center gap-3 flex-wrap">
                      <div className="flex-1 min-w-[220px] flex flex-col gap-0.5">
                        <span className="text-[14px] font-semibold text-[#101212]">{doc.label}</span>
                        {uploadingDoc === doc.key ? <span className="text-[12px] text-[#00635E]">Uploading...</span> : doc.file ? <span className="text-[12px] text-[#28603A]">Done: {doc.file.name}</span> : <span className="text-[12px] text-[#646968]">{doc.hint}</span>}
                      </div>
                      {uploadingDoc === doc.key ? (
                        <span className="w-[18px] h-[18px] border-2 border-[#C3F4F0] border-t-[#004643] rounded-full animate-spin shrink-0" />
                      ) : doc.file ? (
                        <label className="bg-transparent border-0 p-[8px_4px] text-[13px] text-[#646968] hover:text-[#101212] cursor-pointer transition-colors shrink-0">Replace<input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileUpload(e, doc.key)} className="hidden" /></label>
                      ) : (
                        <label className="bg-white border border-[#D5DBDA] rounded-lg px-3 py-2 text-[13px] font-semibold text-[#004643] hover:bg-[#F8FAF9] cursor-pointer transition-colors shrink-0">Upload<input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileUpload(e, doc.key)} className="hidden" /></label>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-gray-300">
                  <button type="button" onClick={() => handleStepChange(2)} className="bg-transparent border-0 py-2.5 text-[14px] text-[#4B4F4F] hover:text-[#101212] transition-colors cursor-pointer">Back</button>
                  <div className="flex items-center gap-3 flex-wrap justify-end">
                    {!isStep3Valid && <span className="text-[12px] text-[#646968]">Enter your registration number</span>}
                    <button type="submit" disabled={!isStep3Valid || submitting} className={["px-6 py-[12px] rounded-lg text-[15px] font-semibold transition-colors bg-[#004643] text-white border-0", isStep3Valid && !submitting ? "hover:bg-[#003836] cursor-pointer" : "opacity-40 cursor-not-allowed"].join(" ")}>{submitting ? "Submitting..." : "Continue"}</button>
                  </div>
                </div>
              </form>
            )}

            {currentStep === 4 && (
              <div className="flex flex-col gap-6">
                <div>
                  <h1 className="text-[26px] font-semibold text-[#101212] mb-1.5 leading-tight">Get paid with Stripe</h1>
                  <p className="text-[14px] text-[#4B4F4F] m-0">Nooi pays out through Stripe. You add your bank account and withdrew there.</p>
                </div>

                {/* Stripe account card */}
                <div className="border border-gray-300 rounded-lg p-5 flex flex-col gap-4 bg-white">
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-semibold text-[#101212]">Stripe account</span>
                    <span className={["text-[12px] font-medium px-2.5 py-1 rounded-full", stripeConnected ? "bg-[#EAF7F5] text-[#004643]" : "bg-[#F4F5F5] text-[#646968]"].join(" ")}>
                      {stripeConnected ? "Connected" : "Not connected"}
                    </span>
                  </div>
                  {stripeConnected ? (
                    <div className="flex items-center gap-2 text-[13px] text-[#28603A]">
                      <span className="w-5 h-5 rounded-full bg-[#004643] text-white flex items-center justify-center text-[10px] shrink-0 font-bold">✓</span>
                      Your Stripe account is connected. Payouts start after approval.
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConnectStripe}
                      disabled={connectingStripe}
                      className="self-start bg-[#004643] hover:bg-[#003836] text-white border-0 rounded-lg px-5 py-[10px] text-[14px] font-semibold transition-colors cursor-pointer disabled:opacity-60 flex items-center gap-2"
                    >
                      {connectingStripe && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                      {connectingStripe ? "Connecting..." : "Connect with Stripe"}
                    </button>
                  )}
                </div>

                {/* Info note */}
                <div className="bg-[#F8FAF9] border border-[#EAEDEC] rounded-lg px-4 py-3 text-[13px] text-[#4B4F4F] leading-relaxed">
                  You can skip this and connect later from Payments. Payouts start once Stripe verifies your account.
                </div>

                {/* Nav */}
                <div className="flex items-center justify-between gap-3 flex-wrap pt-4 border-t border-gray-300">
                  <button type="button" onClick={() => handleStepChange(3)} className="bg-transparent border-0 py-2.5 text-[14px] text-[#4B4F4F] hover:text-[#101212] transition-colors cursor-pointer">← Back</button>
                  <button type="button" onClick={() => handleStepChange(5)} className="bg-[#004643] hover:bg-[#003836] text-white border-0 rounded-lg px-5 py-[12px] text-[15px] font-medium cursor-pointer">Continue</button>
                </div>
              </div>
            )}


            {currentStep === 5 && (
              <form onSubmit={handleFinalSubmit} className="flex flex-col gap-6">
                <div>
                  <h1 className="text-[26px] font-semibold text-[#101212] mb-1.5 leading-tight">Review and submit</h1>
                  <p className="text-[14px] text-[#4B4F4F] m-0">Check everything once. After submitting, fields lock until review is done.</p>
                </div>

                {/* Three separate review cards */}
                <div className="flex flex-col gap-3">
                  {/* Store profile */}
                  <div className="border border-gray-300 rounded-lg px-5 py-4 flex items-start justify-between gap-4 bg-white">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[14px] font-semibold text-[#101212]">Store profile</span>
                      <span className="text-[13px] text-[#646968]">
                        {[storeProfile.storeName || "-", storeProfile.fulfillmentType || null, storeProfile.city || null].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                    <button type="button" onClick={() => handleStepChange(2)} className="text-[13px] font-medium text-[#004643] hover:underline shrink-0 cursor-pointer bg-transparent border-0">Edit</button>
                  </div>

                  {/* Legal documents */}
                  <div className="border border-gray-300 rounded-lg px-5 py-4 flex items-start justify-between gap-4 bg-white">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[14px] font-semibold text-[#101212]">Legal documents</span>
                      <span className="text-[13px] text-[#646968]">
                        CR {legalDocs.commercialRegistrationNumber || "-"} · VAT {legalDocs.vatNumber || "-"} · {[legalDocs.commercialRegistrationCertificate, legalDocs.vatRegistrationCertificate, legalDocs.authorisedSignatoryId].filter(Boolean).length} documents attached
                      </span>
                    </div>
                    <button type="button" onClick={() => handleStepChange(3)} className="text-[13px] font-medium text-[#004643] hover:underline shrink-0 cursor-pointer bg-transparent border-0">Edit</button>
                  </div>

                  {/* Stripe payouts */}
                  <div className="border border-gray-300 rounded-lg px-5 py-4 flex items-start justify-between gap-4 bg-white">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[14px] font-semibold text-[#101212]">Stripe payouts</span>
                      <span className="text-[13px] text-[#646968]">
                        {stripeConnected ? "Stripe account connected" : "Not connected — you can connect after approval"}
                      </span>
                    </div>
                    <button type="button" onClick={() => handleStepChange(4)} className="text-[13px] font-medium text-[#004643] hover:underline shrink-0 cursor-pointer bg-transparent border-0">Edit</button>
                  </div>
                </div>

                {/* Confirmation checkbox */}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    id="confirm-checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[#004643] shrink-0 cursor-pointer"
                  />
                  <span className="text-[13px] text-[#343837] leading-relaxed">
                    I confirm these details are accurate and I&apos;m authorised to act for{" "}
                    <strong>{storeProfile.storeName || accountData.businessName || "my business"}</strong>.
                  </span>
                </label>

                {/* Nav */}
                <div className="flex items-center justify-between gap-3 flex-wrap pt-4 border-t border-gray-300">
                  <button type="button" onClick={() => handleStepChange(4)} className="bg-transparent border-0 py-2.5 text-[14px] text-[#4B4F4F] hover:text-[#101212] transition-colors cursor-pointer">← Back</button>
                  <button
                    type="submit"
                    disabled={!confirmed || submitting}
                    className={["px-6 py-[12px] rounded-lg text-[15px] font-semibold transition-colors bg-[#004643] text-white border-0", confirmed && !submitting ? "hover:bg-[#003836] cursor-pointer" : "opacity-40 cursor-not-allowed"].join(" ")}
                  >
                    {submitting ? "Submitting..." : "Submit application"}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

export default function VendorOnboardingPage() {
  return (
    <Suspense fallback={null}>
      <VendorOnboardingInner />
    </Suspense>
  );
}
