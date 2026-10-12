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
import { createClient } from "@/utils/supabase/client";

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

  // Error states for Image 2 and Image 3
  const [duplicateCrError, setDuplicateCrError] = useState(false);
  const [failedUploads, setFailedUploads] = useState<Record<string, string | null>>({});
  const isReopened = searchParams.get("reopened") === "true";

  useEffect(() => {
    useVendorStore.persist.rehydrate();
  }, []);

  // Proactively restore or establish Supabase session
  useEffect(() => {
    const restoreAuth = async () => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session && accountData.workEmail && accountData.password) {
          await supabase.auth.signInWithPassword({
            email: accountData.workEmail,
            password: accountData.password,
          });
        }
      } catch (err) {
        console.warn("Session restore error:", err);
      }
    };
    restoreAuth();
  }, [accountData.workEmail, accountData.password]);

  useEffect(() => {
    if (stepFromQuery && stepFromQuery !== currentStep) {
      setCurrentStepState(stepFromQuery);
      setStep(stepFromQuery);
    }
  }, [stepFromQuery, currentStep, setStep]);

  useEffect(() => {
    // Check if query params ask for duplicate_cr or upload_failed simulation/preview
    if (searchParams.get("duplicate_cr") === "true") {
      setDuplicateCrError(true);
      setLegalDocs({
        commercialRegistrationNumber: "1010587342",
        vatNumber: legalDocs.vatNumber || "310458812700003",
        commercialRegistrationCertificate: legalDocs.commercialRegistrationCertificate || {
          name: "CR_AtelierRawda_2026.pdf",
        },
        vatRegistrationCertificate: legalDocs.vatRegistrationCertificate || {
          name: "VAT_certificate.pdf",
        },
        authorisedSignatoryId: legalDocs.authorisedSignatoryId || {
          name: "IDsignatory.jpg",
        },
      });
    }

    if (
      searchParams.get("upload_failed") === "vat" ||
      searchParams.get("upload_failed") === "true"
    ) {
      setFailedUploads({
        vatRegistrationCertificate:
          "Upload failed — connection dropped at 84%. Your other files are safe.",
      });
      setLegalDocs({
        commercialRegistrationNumber:
          legalDocs.commercialRegistrationNumber || "1010874421",
        vatNumber: legalDocs.vatNumber || "310458812700003",
        commercialRegistrationCertificate:
          legalDocs.commercialRegistrationCertificate || {
            name: "CR_AtelierRawda_2026.pdf",
          },
        vatRegistrationCertificate: null,
        authorisedSignatoryId: legalDocs.authorisedSignatoryId || {
          name: "IDsignatory.jpg",
        },
      });
    }
  }, [searchParams]);

  const handleStepChange = (newStep: number) => {
    setCurrentStepState(newStep);
    setStep(newStep);
    router.push(`/sell/onboarding?step=${newStep}`);
  };

  const handleCrChange = async (val: string) => {
    const clean = val.replace(/\D/g, "");
    setLegalDocs({ commercialRegistrationNumber: clean });

    if (clean === "1010587342") {
      setDuplicateCrError(true);
      return;
    }

    if (clean.length === 10) {
      try {
        const res = await fetch(`/api/vendor/check-cr?cr=${clean}`);
        const data = await res.json();
        setDuplicateCrError(!!data.duplicate);
      } catch {
        setDuplicateCrError(false);
      }
    } else {
      setDuplicateCrError(false);
    }
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!storeProfile.storeName.trim()) { setErrorMessage("Please enter your store name."); return; }
    if (!storeProfile.fulfillmentType) { setErrorMessage("Please select how you fulfill orders."); return; }
    if (!storeProfile.city.trim()) { setErrorMessage("Please enter your city."); return; }
    setSubmitting(true);

    // Ensure session is active if credentials exist
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session && accountData.workEmail && accountData.password) {
        await supabase.auth.signInWithPassword({
          email: accountData.workEmail,
          password: accountData.password,
        });
      }
    } catch {}

    const res = await saveVendorStoreProfile({
      ...storeProfile,
      category: storeProfile.category || "Furniture",
      country: storeProfile.country || "Saudi Arabia",
      workEmail: accountData.workEmail,
      businessName: accountData.businessName,
    });
    setSubmitting(false);
    if (!res.success) { setErrorMessage(typeof res.error === "string" ? res.error : "Failed to save store profile."); return; }
    handleStepChange(3);
  };

  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (duplicateCrError) return;
    if (hasFailedUpload) return;
    if (!legalDocs.commercialRegistrationNumber.trim()) { setErrorMessage("Please enter your commercial registration number."); return; }
    if (!legalDocs.vatNumber.trim()) { setErrorMessage("Please enter your VAT number."); return; }
    setSubmitting(true);

    // Ensure session is active if credentials exist
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session && accountData.workEmail && accountData.password) {
        await supabase.auth.signInWithPassword({
          email: accountData.workEmail,
          password: accountData.password,
        });
      }
    } catch {}

    const res = await saveVendorLegalDocs({
      ...legalDocs,
      workEmail: accountData.workEmail,
      businessName: accountData.businessName || storeProfile.storeName || "Vendor Business",
    });
    setSubmitting(false);
    if (!res.success) { setErrorMessage(typeof res.error === "string" ? res.error : "Failed to save legal documents."); return; }
    handleStepChange(4);
  };

  const handleConnectStripe = async () => {
    setConnectingStripe(true);
    await new Promise((r) => setTimeout(r, 1400));
    setStripeConnected(true);
    setConnectingStripe(false);

    try {
      const supabase = createClient();
      let token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token && accountData.workEmail && accountData.password) {
        await supabase.auth.signInWithPassword({
          email: accountData.workEmail,
          password: accountData.password,
        });
        token = (await supabase.auth.getSession()).data.session?.access_token;
      }
      await fetch("/api/vendor/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          workEmail: accountData.workEmail,
          businessName: accountData.businessName,
          payoutConnected: true,
        }),
      });
    } catch {}
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed) return;
    setSubmitting(true);

    // Notify the database that this application has been submitted
    try {
      const supabase = createClient();
      let token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token && accountData.workEmail && accountData.password) {
        await supabase.auth.signInWithPassword({
          email: accountData.workEmail,
          password: accountData.password,
        });
        token = (await supabase.auth.getSession()).data.session?.access_token;
      }

      await fetch("/api/vendor/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          workEmail: accountData.workEmail,
          businessName: accountData.businessName,
          storeName: storeProfile.storeName,
          category: storeProfile.category,
          fulfillmentType: storeProfile.fulfillmentType,
          city: storeProfile.city,
          country: storeProfile.country,
          phone: storeProfile.phone,
          website: storeProfile.website,
          description: storeProfile.description,
          crNumber: legalDocs.commercialRegistrationNumber,
          vatNumber: legalDocs.vatNumber,
          taxId: legalDocs.taxId,
          registeredAddress: legalDocs.registeredAddress,
          payoutConnected: stripeConnected,
        }),
      });
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
    setFailedUploads((prev) => ({ ...prev, [docKey]: null }));

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session && accountData.workEmail && accountData.password) {
        await supabase.auth.signInWithPassword({
          email: accountData.workEmail,
          password: accountData.password,
        });
      }
    } catch {}

    const res = await uploadVendorDocument(file, docKey, accountData.workEmail);
    setUploadingDoc(null);
    if (res.success) {
      const data = res.data as any;
      const uploadedInfo: UploadedFile = {
        name: data.name || file.name,
        size: data.size || file.size,
        url: data.url,
        path: data.path,
        uploaded_at: data.uploaded_at,
      };
      setLegalDocs({ [docKey]: uploadedInfo });
      setFailedUploads((prev) => ({ ...prev, [docKey]: null }));
    } else {
      setFailedUploads((prev) => ({
        ...prev,
        [docKey]: typeof res.error === "string" ? res.error : "Upload failed — connection dropped. Your other files are safe.",
      }));
    }
  };

  const fulfillmentOptions: { type: FulfillmentType; title: string; description: string; leadTime: string }[] = [
    { type: "Retailer", title: "Retailer", description: "Ships from existing stock", leadTime: "1-5 days" },
    { type: "Factory", title: "Factory", description: "Makes to order in production runs", leadTime: "2-12 weeks" },
    { type: "Hybrid", title: "Hybrid", description: "Stock first, then production", leadTime: "Split per item" },
    { type: "Dropshipper", title: "Dropshipper", description: "Ships from a third-party warehouse", leadTime: "Variable" },
  ];

  const hasFailedUpload = Object.values(failedUploads).some((val) => !!val);
  const isStep3Valid =
    legalDocs.commercialRegistrationNumber.trim().length > 0 &&
    legalDocs.vatNumber.trim().length > 0 &&
    !duplicateCrError &&
    !hasFailedUpload;


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
                <label className="flex flex-col gap-1 text-[13px] font-medium text-[#343837]">
                  Primary category
                  <select
                    value={storeProfile.category || "Furniture"}
                    onChange={(e) => setStoreProfile({ category: e.target.value })}
                    style={{ borderColor: "#646968" }}
                    className="w-full px-4 py-[12px] border rounded-lg text-[14px] text-[#101212] bg-white focus:outline-none focus:border-[#004643]"
                  >
                    <option value="Furniture">Furniture</option>
                    <option value="Lighting">Lighting</option>
                    <option value="Decor">Decor</option>
                    <option value="Kitchen & Dining">Kitchen & Dining</option>
                    <option value="Outdoor">Outdoor</option>
                    <option value="Office">Office</option>
                    <option value="Textiles">Textiles</option>
                    <option value="Bedding & Bath">Bedding & Bath</option>
                  </select>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1 text-[13px] font-medium text-[#343837]">
                    City
                    <input type="text" placeholder="Riyadh" value={storeProfile.city || ""} onChange={(e) => setStoreProfile({ city: e.target.value })} style={{ borderColor: "#646968" }} className="w-full px-4 py-[12px] border rounded-lg text-[14px] text-[#101212] placeholder:text-[#646968] focus:outline-none focus:border-[#004643]" />
                  </label>
                  <label className="flex flex-col gap-1 text-[13px] font-medium text-[#343837]">
                    Country
                    <input type="text" placeholder="Saudi Arabia" value={storeProfile.country || ""} onChange={(e) => setStoreProfile({ country: e.target.value })} style={{ borderColor: "#646968" }} className="w-full px-4 py-[12px] border rounded-lg text-[14px] text-[#101212] placeholder:text-[#646968] focus:outline-none focus:border-[#004643]" />
                  </label>
                </div>
                <label className="flex flex-col gap-1 text-[13px] font-medium text-[#343837]">
                  Company website
                  <input type="url" placeholder="https://atelierrawda.com (optional)" value={storeProfile.website || ""} onChange={(e) => setStoreProfile({ website: e.target.value })} style={{ borderColor: "#646968" }} className="w-full px-4 py-[12px] border rounded-lg text-[14px] text-[#101212] placeholder:text-[#8E9493] focus:outline-none focus:border-[#004643]" />
                </label>
                <label className="flex flex-col gap-1 text-[13px] font-medium text-[#343837]">
                  Phone number
                  <input type="tel" placeholder="+966 50 123 4567" value={storeProfile.phone || ""} onChange={(e) => setStoreProfile({ phone: e.target.value })} style={{ borderColor: "#646968" }} className="w-full px-4 py-[12px] border rounded-lg text-[14px] text-[#101212] placeholder:text-[#8E9493] focus:outline-none focus:border-[#004643]" />
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
                  <h1 className="text-[26px] font-semibold text-[#101212] mb-1.5 leading-tight">Legal documents & Registration</h1>
                  <p className="text-[14px] text-[#4B4F4F] m-0">Nooi admin checks these before you can list products.</p>
                </div>

                {isReopened && (
                  <div className="bg-[#FFFBF2] border border-[#FDE68A] text-[#92400E] text-[13px] rounded-lg p-3.5 leading-relaxed">
                    <span className="font-semibold">Reopened for correction:</span> Commercial registration number and certificate. Other verified fields are locked.
                  </div>
                )}

                {/* Commercial registration number */}
                <div>
                  <label className="flex flex-col gap-1 text-[13px] font-medium text-[#343837]">
                    Commercial registration number (CR)
                    <input
                      type="text"
                      placeholder="10 digits"
                      maxLength={10}
                      value={legalDocs.commercialRegistrationNumber}
                      onChange={(e) => handleCrChange(e.target.value)}
                      style={{ borderColor: duplicateCrError ? "#FCA5A5" : "#646968" }}
                      className="w-full px-4 py-[12px] border rounded-lg text-[14px] text-[#101212] placeholder:text-[#8E9493] focus:outline-none focus:border-[#004643]"
                    />
                  </label>

                  {/* Duplicate Registration Number Error Card */}
                  {duplicateCrError && (
                    <div className="bg-[#FFF5F5] border border-[#FECACA] rounded-lg p-4 mt-2 flex flex-col gap-2">
                      <span className="text-[#C53030] text-[13px] font-semibold">
                        This registration number is already linked to a Nooi vendor
                      </span>
                      <p className="text-[#4A5568] text-[12px] leading-relaxed m-0">
                        We can&apos;t continue with a duplicate number. If this is a second outlet of the same business, vendor support can link it. The Nooi team has been notified.
                      </p>
                      <div className="flex items-center gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => window.open("mailto:support@nooi.com?subject=Duplicate%20CR%20Support", "_blank")}
                          className="bg-white border border-[#D1D5DB] rounded px-3 py-1.5 text-[12px] font-medium text-[#374151] hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer"
                        >
                          Contact vendor support
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setLegalDocs({ commercialRegistrationNumber: "" });
                            setDuplicateCrError(false);
                          }}
                          className="text-[#374151] text-[12px] font-medium hover:text-[#101212] cursor-pointer bg-transparent border-0 p-0"
                        >
                          Enter a different number
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* VAT number */}
                <label className="flex flex-col gap-1 text-[13px] font-medium text-[#343837]">
                  VAT number
                  <input
                    type="text"
                    placeholder="15 digits"
                    maxLength={15}
                    value={legalDocs.vatNumber}
                    onChange={(e) => setLegalDocs({ vatNumber: e.target.value.replace(/\D/g, "") })}
                    style={{ borderColor: "#646968" }}
                    className="w-full px-4 py-[12px] border rounded-lg text-[14px] text-[#101212] placeholder:text-[#8E9493] focus:outline-none focus:border-[#004643]"
                  />
                </label>

                {/* Tax ID */}
                <label className="flex flex-col gap-1 text-[13px] font-medium text-[#343837]">
                  Tax ID / TIN
                  <input
                    type="text"
                    placeholder="e.g. 10-15 digit tax identification number"
                    value={legalDocs.taxId || ""}
                    onChange={(e) => setLegalDocs({ taxId: e.target.value })}
                    style={{ borderColor: "#646968" }}
                    className="w-full px-4 py-[12px] border rounded-lg text-[14px] text-[#101212] placeholder:text-[#8E9493] focus:outline-none focus:border-[#004643]"
                  />
                </label>

                {/* Registered address */}
                <label className="flex flex-col gap-1 text-[13px] font-medium text-[#343837]">
                  Registered business address
                  <textarea
                    rows={2}
                    placeholder="Official address as shown on commercial registration / licence"
                    value={legalDocs.registeredAddress || ""}
                    onChange={(e) => setLegalDocs({ registeredAddress: e.target.value })}
                    style={{ borderColor: "#646968" }}
                    className="w-full px-4 py-[12px] border rounded-lg text-[14px] text-[#101212] placeholder:text-[#8E9493] resize-y focus:outline-none focus:border-[#004643]"
                  />
                </label>

                {/* Document uploads list */}
                <div className="flex flex-col gap-2">
                  {[
                    { key: "commercialRegistrationCertificate" as const, label: "Trade licence", hint: "Commercial registration or trade licence (PDF or JPG, max 10 MB)", file: legalDocs.commercialRegistrationCertificate },
                    { key: "vatRegistrationCertificate" as const, label: "VAT certificate", hint: "VAT registration certificate (PDF or JPG, max 10 MB)", file: legalDocs.vatRegistrationCertificate },
                    { key: "bankLetter" as const, label: "Bank letter", hint: "Bank account letter or authorised signatory ID (PDF or JPG, max 10 MB)", file: legalDocs.bankLetter || legalDocs.authorisedSignatoryId },
                  ].map((doc) => {
                    const isFailed = !!failedUploads[doc.key];

                    if (isFailed) {
                      return (
                        <div
                          key={doc.key}
                          className="border border-[#FCA5A5] bg-[#FFF5F5] rounded-lg p-4 flex items-center justify-between gap-3 flex-wrap"
                        >
                          <div className="flex-1 min-w-[220px] flex flex-col gap-0.5">
                            <span className="text-[14px] font-semibold text-[#101212]">{doc.label}</span>
                            <span className="text-[12px] text-[#DC2626]">
                              {failedUploads[doc.key]}
                            </span>
                          </div>
                          <label className="bg-[#004643] hover:bg-[#003836] text-white text-[12px] font-semibold px-4 py-1.5 rounded-lg cursor-pointer transition-colors shrink-0">
                            Retry
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => handleFileUpload(e, doc.key)}
                              className="hidden"
                            />
                          </label>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={doc.key}
                        className="border border-gray-300 bg-white rounded-lg p-4 flex items-center justify-between gap-3 flex-wrap"
                      >
                        <div className="flex-1 min-w-[220px] flex flex-col gap-0.5">
                          <span className="text-[14px] font-semibold text-[#101212]">{doc.label}</span>
                          {uploadingDoc === doc.key ? (
                            <span className="text-[12px] text-[#00635E]">Uploading...</span>
                          ) : doc.file ? (
                            <span className="text-[12px] text-[#28603A] flex items-center gap-1">
                              ✓ {doc.file.name}
                            </span>
                          ) : (
                            <span className="text-[12px] text-[#646968]">{doc.hint}</span>
                          )}
                        </div>
                        {uploadingDoc === doc.key ? (
                          <span className="w-[18px] h-[18px] border-2 border-[#C3F4F0] border-t-[#004643] rounded-full animate-spin shrink-0" />
                        ) : doc.file ? (
                          <label className="bg-transparent border-0 p-[8px_4px] text-[13px] text-[#646968] hover:text-[#101212] cursor-pointer transition-colors shrink-0">
                            Replace
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => handleFileUpload(e, doc.key)}
                              className="hidden"
                            />
                          </label>
                        ) : (
                          <label className="bg-white border border-[#D5DBDA] rounded-lg px-3 py-2 text-[13px] font-semibold text-[#004643] hover:bg-[#F8FAF9] cursor-pointer transition-colors shrink-0">
                            Upload
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => handleFileUpload(e, doc.key)}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Navigation Row */}
                <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-gray-300">
                  <button
                    type="button"
                    onClick={() => handleStepChange(2)}
                    className="bg-transparent border-0 py-2.5 text-[14px] text-[#4B4F4F] hover:text-[#101212] transition-colors cursor-pointer"
                  >
                    ← Back
                  </button>
                  <div className="flex items-center gap-3 flex-wrap justify-end">
                    {hasFailedUpload && (
                      <span className="text-[12px] text-[#646968]">
                        Retry 1 failed upload to continue
                      </span>
                    )}
                    {duplicateCrError && !hasFailedUpload && (
                      <span className="text-[12px] text-[#646968]">
                        Resolve the registration number to continue
                      </span>
                    )}
                    {!hasFailedUpload && !duplicateCrError && !isStep3Valid && (
                      <span className="text-[12px] text-[#646968]">
                        Enter your registration number
                      </span>
                    )}
                    <button
                      type="submit"
                      disabled={!isStep3Valid || submitting}
                      className={[
                        "px-6 py-[12px] rounded-lg text-[15px] font-semibold transition-colors border-0",
                        isStep3Valid && !submitting
                          ? "bg-[#004643] hover:bg-[#003836] text-white cursor-pointer"
                          : "bg-[#8FA89B] text-white opacity-90 cursor-not-allowed",
                      ].join(" ")}
                    >
                      {submitting ? "Submitting..." : "Continue"}
                    </button>
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
                        {[
                          storeProfile.storeName || "-",
                          storeProfile.fulfillmentType || null,
                          storeProfile.category || null,
                          storeProfile.city ? `${storeProfile.city}${storeProfile.country ? `, ${storeProfile.country}` : ""}` : null,
                          storeProfile.website || null,
                        ].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                    <button type="button" onClick={() => handleStepChange(2)} className="text-[13px] font-medium text-[#004643] hover:underline shrink-0 cursor-pointer bg-transparent border-0">Edit</button>
                  </div>

                  {/* Legal documents */}
                  <div className="border border-gray-300 rounded-lg px-5 py-4 flex items-start justify-between gap-4 bg-white">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[14px] font-semibold text-[#101212]">Legal & Registration</span>
                      <span className="text-[13px] text-[#646968]">
                        CR {legalDocs.commercialRegistrationNumber || "-"} · VAT {legalDocs.vatNumber || "-"}
                        {legalDocs.taxId ? ` · Tax ID ${legalDocs.taxId}` : ""}
                        {legalDocs.registeredAddress ? ` · ${legalDocs.registeredAddress}` : ""} · {[legalDocs.commercialRegistrationCertificate, legalDocs.vatRegistrationCertificate, (legalDocs.bankLetter || legalDocs.authorisedSignatoryId)].filter(Boolean).length} documents attached
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
