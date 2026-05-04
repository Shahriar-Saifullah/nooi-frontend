"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveOnboarding } from "@/lib/api/auth";
import { ArrowRight, ArrowLeft } from "lucide-react";


type Step = "welcome" | "user_type" | "project_types" | "topics";


const USER_TYPES = [
  { label: "Home owner",                          value: "home_owner" },
  { label: "Tenant",                              value: "tenant" },
  { label: "Interior designer / Architect",       value: "interior_designer_architect" },
  { label: "Design student",                      value: "design_student" },
  { label: "Brand / Merchant",                    value: "brand_merchant" },
  { label: "Manufacturer",                        value: "manufacturer" },
  { label: "Builder / Real estate professionals", value: "builder_real_estate" },
  { label: "Carpenter",                           value: "carpenter" },
  { label: "Contractor",                          value: "contractor" },
];

const PROJECT_TYPES = [
  { label: "Full home renovation",    value: "full_home_renovation" },
  { label: "Single room redesign",    value: "single_room_redesign" },
  { label: "New construction",        value: "new_construction" },
  { label: "Furniture shopping",      value: "furniture_shopping" },
  { label: "Decor updates",           value: "decor_updates" },
  { label: "Space planning",          value: "space_planning" },
  { label: "Color consultation",      value: "color_consultation" },
  { label: "Just browsing for ideas", value: "just_browsing" },
  { label: "Other",                   value: "other" },
];

const TOPIC_GROUPS = [
  {
    group: "Furniture",
    topics: [
      "Dining table", "Bookshelves", "Side table", "Wardrobes", "Coffee table",
      "Sofa", "Bed", "Storage", "Breakfast table", "Accent chairs", "TV unit", "Study table",
    ],
  },
  {
    group: "Decor and Lighting",
    topics: [
      "Artwork", "Mirrors", "Lamps", "Curtains", "Photo frames",
      "Canvas Painting", "Rugs", "Floor lamps", "Table lamps", "Planters", "Study table",
    ],
  },
  {
    group: "Rooms",
    topics: [
      "Floor", "Balcony design", "Kids bedroom", "Nursery", "Home office",
      "Living room", "Dining room", "Master bedroom", "Bathroom", "Kitchen",
    ],
  },
  {
    group: "Walls and Floor",
    topics: [
      "Paint", "Wooden flooring", "Wallpaper (stickers)", "Vinyl flooring",
      "Hardwood floor", "Marble tiles", "Wallpaper", "Balance tiles",
    ],
  },
];

const IMAGES = [
  "/Images/img1.png", "/Images/img2.png", "/Images/img3.png",
  "/Images/img4.png", "/Images/img5.png", "/Images/img6.png",
  "/Images/img7.png", "/Images/img8.png", "/Images/img9.png",
  "/Images/img10.png", "/Images/img11.png", "/Images/img12.png",
];


function MasonryBackground({ dimmed = false }: { dimmed?: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="w-full h-full grid gap-2"
        style={{ gridTemplateColumns: "repeat(5, 1fr)" }}
      >
        {IMAGES.map((src, i) => (
          <div key={i} className="relative overflow-hidden">
            <img
              src={src}
              alt=""
              className="w-full h-full object-cover"
              style={{ minHeight: "200px" }}
            />
          </div>
        ))}
      </div>
      {dimmed && <div className="absolute inset-0 bg-black/40" />}
    </div>
  );
}


function RadioOption({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
        selected
          ? "border-[#1B5E5E] bg-white"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <span
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
          selected ? "border-[#1B5E5E] bg-[#1B5E5E]" : "border-gray-300"
        }`}
      >
        {selected && <span className="w-2 h-2 rounded-full bg-white" />}
      </span>
      <span className="text-[14px] text-gray-800">{label}</span>
    </button>
  );
}


function CheckboxOption({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
        selected
          ? "border-[#1B5E5E] bg-white"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <span
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
          selected ? "border-[#1B5E5E] bg-[#1B5E5E]" : "border-gray-300"
        }`}
      >
        {selected && <span className="w-2 h-2 rounded-full bg-white" />}
      </span>
      <span className="text-[14px] text-gray-800">{label}</span>
    </button>
  );
}


function TagOption({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-full border text-[13px] font-medium transition-all ${
        selected
          ? "bg-[#1B5E5E] border-[#1B5E5E] text-white"
          : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
      }`}
    >
      {label}
    </button>
  );
}


function NavButtons({
  onBack,
  onNext,
  nextLabel = "Next",
  nextDisabled = false,
  loading = false,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  loading?: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-100 mt-4">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-[14px] text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled || loading}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-semibold transition-all ${
          nextDisabled || loading
            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
            : "bg-[#1B5E5E] hover:bg-[#154646] text-white"
        }`}
      >
        {loading ? "Saving..." : nextLabel}
        {!loading && <ArrowRight className="size-4" />}
      </button>
    </div>
  );
}


export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  const [userType, setUserType] = useState("");
  const [projectTypes, setProjectTypes] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const toggleProject = (value: string) => {
    setProjectTypes((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const toggleTopic = (value: string) => {
    setTopics((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const handleComplete = async () => {
    if (topics.length === 0) {
      setError("Please select at least one topic.");
      return;
    }
    setError("");
    setSubmitting(true);
    const res = await saveOnboarding({
      user_type: userType,
      project_types: projectTypes,
      interested_topics: topics,
    });
    setSubmitting(false);
    if (!res.success) {
      setError(
        typeof res.error === "string"
          ? res.error
          : "Something went wrong. Please try again."
      );
      return;
    }
    router.push("/dashboard");
  };

  if (step === "welcome") {
    return (
      <div className="flex h-screen w-full overflow-hidden">
        {/* Left white panel */}
        <div className="flex flex-col justify-center gap-8 px-16 py-12 bg-white w-[420px] shrink-0 z-10">
          <img src="/Logo/Logo.svg" alt="Nooi" className="w-24" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome to nooi</h1>
            <p className="text-gray-500 text-sm mt-1">Let&apos;s set up your profile</p>
          </div>
          <button
            type="button"
            onClick={() => setStep("user_type")}
            className="inline-flex items-center gap-3 bg-[#1B5E5E] hover:bg-[#154646] text-white font-semibold px-6 py-3 rounded-xl transition-all w-fit"
          >
            Get Started
            <span className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <ArrowRight className="size-4" />
            </span>
          </button>
        </div>

        {/* Right masonry grid */}
        <div className="flex-1 overflow-hidden">
          <div
            className="w-full h-full grid gap-2"
            style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
          >
            {IMAGES.map((src, i) => (
              <div key={i} className="overflow-hidden">
                <img
                  src={src}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }


  if (step === "user_type") {
    return (
      <div className="relative h-screen w-full overflow-hidden flex items-center justify-center">
        <MasonryBackground dimmed />
        <div className="relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-8 max-h-[90vh] overflow-y-auto">
          <h2 className="text-[20px] font-bold text-gray-900 mb-5">
            1. What describes you the best?
          </h2>
          <div className="space-y-2">
            {USER_TYPES.map((item) => (
              <RadioOption
                key={item.value}
                label={item.label}
                selected={userType === item.value}
                onClick={() => setUserType(item.value)}
              />
            ))}
          </div>
          <NavButtons
            onBack={() => setStep("welcome")}
            onNext={() => { if (userType) setStep("project_types"); }}
            nextDisabled={!userType}
          />
        </div>
      </div>
    );
  }

  if (step === "project_types") {
    return (
      <div className="relative h-screen w-full overflow-hidden flex items-center justify-center">
        <MasonryBackground dimmed />
        <div className="relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-8 max-h-[90vh] overflow-y-auto">
          <h2 className="text-[20px] font-bold text-gray-900 mb-1">
            2. What type of project are you working on?
          </h2>
          <p className="text-[13px] text-gray-500 mb-5">Select all that apply</p>
          <div className="space-y-2">
            {PROJECT_TYPES.map((item) => (
              <CheckboxOption
                key={item.value}
                label={item.label}
                selected={projectTypes.includes(item.value)}
                onClick={() => toggleProject(item.value)}
              />
            ))}
          </div>
          <NavButtons
            onBack={() => setStep("user_type")}
            onNext={() => { if (projectTypes.length > 0) setStep("topics"); }}
            nextDisabled={projectTypes.length === 0}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full overflow-hidden flex items-center justify-center">
      <MasonryBackground dimmed />
      <div className="relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 p-8 max-h-[90vh] overflow-y-auto">
        <h2 className="text-[20px] font-bold text-gray-900 mb-1">
          3. Select topics that you are interested in
        </h2>
        <p className="text-[13px] text-gray-500 mb-6">Select as many options as you like</p>

        <div className="space-y-6">
          {TOPIC_GROUPS.map((group) => (
            <div key={group.group}>
              <h3 className="text-[13px] font-semibold text-gray-700 mb-3">
                {group.group}
              </h3>
              <div className="flex flex-wrap gap-2">
                {group.topics.map((topic) => (
                  <TagOption
                    key={`${group.group}-${topic}`}
                    label={topic}
                    selected={topics.includes(topic)}
                    onClick={() => toggleTopic(topic)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <p className="text-red-500 text-[13px] mt-4">{error}</p>
        )}

        <NavButtons
          onBack={() => setStep("project_types")}
          onNext={handleComplete}
          nextLabel="Complete"
          nextDisabled={topics.length === 0}
          loading={submitting}
        />
      </div>
    </div>
  );
}