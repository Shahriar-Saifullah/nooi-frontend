"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { generatePreview } from "@/lib/api/ai";
import { AI_MODEL_OPTIONS, type AiModel } from "@/lib/api/projects";

export default function LandingPromptBox() {
  const [prompt, setPrompt] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AiModel>("gemini");
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [modelMenuOpensUp, setModelMenuOpensUp] = useState(false);
  const modelButtonRef = useRef<HTMLButtonElement>(null);
  const [mentionMenuOpen, setMentionMenuOpen] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const isPromptActive = prompt.trim() !== "" || attachedFile !== null;
  const selectedModelLabel = AI_MODEL_OPTIONS.find(m => m.value === selectedModel)?.label ?? "Gemini";

  const handleGenerate = async () => {
    if (!isPromptActive || isGenerating) return;

    setIsGenerating(true);
    setGenerateError(null);
    setGeneratedImageUrl(null);

    try {
      // Model selection is UI-only for now (placeholder labels, same as the
      // in-app prompt box) — every option routes to the same Gemini call on
      // the backend until real multi-provider routing is built.
      const result = await generatePreview(prompt, attachedFile);
      setGeneratedImageUrl(result.image_url);
    } catch (err: any) {
      setGenerateError(err.message || "Failed to generate preview. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full max-w-[900px] flex flex-col gap-[16px]" style={{ position: "relative", zIndex: 20 }}>
      <div
        className="bg-white border border-[#d8d9da] rounded-[18px] shadow-[0px_20px_60px_rgba(0,0,0,0.07),0px_4px_16px_rgba(0,0,0,0.04)] w-full pt-[20px] pb-[14px] px-[20px] flex flex-col gap-[16px]"
        onWheel={(e) => e.stopPropagation()}
      >
        {/* Textarea */}
        <textarea
          placeholder="Describe the room or design you want to create"
          className="w-full bg-transparent outline-none resize-none font-schibsted font-normal text-[17px] leading-[1.55] text-[#111d27] placeholder:text-[#a8adb3] min-h-[56px]"
          rows={2}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isGenerating}
        />

        {/* Attached file pill */}
        {attachedFile && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 text-[12px] text-[#004643] font-medium bg-[#eaf8f4] rounded-[6px] w-fit -mt-2 mb-2 border border-[#b2d9d1]">
            <span className="truncate max-w-[200px]">{attachedFile.name}</span>
            <button
              type="button"
              onClick={() => setAttachedFile(null)}
              className="text-[#a3a3a3] hover:text-red-500 font-bold ml-1"
            >
              ×
            </button>
          </div>
        )}

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between w-full" style={{ position: "relative", zIndex: 30 }}>
          {/* Left side: Attach + Model Selector + @ */}
          <div className="flex items-center gap-[8px]">
            {/* Paperclip */}
            <label className="w-[36px] h-[36px] border border-[#d8d9da] rounded-[10px] flex items-center justify-center hover:bg-[#f7f8f8] transition-colors cursor-pointer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setAttachedFile(e.target.files[0]);
                  }
                }}
              />
            </label>

            {/* AI Model Selector — placeholder labels; every option routes to
                the same Gemini image model on the backend for now */}
            <div style={{ position: "relative" }}>
              <button
                ref={modelButtonRef}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (!modelMenuOpen && modelButtonRef.current) {
                    const rect = modelButtonRef.current.getBoundingClientRect();
                    const spaceBelow = window.innerHeight - rect.bottom;
                    const estimatedMenuHeight = 220; // ~5 items at ~44px each
                    setModelMenuOpensUp(spaceBelow < estimatedMenuHeight);
                  }
                  setModelMenuOpen(v => !v);
                  setMentionMenuOpen(false);
                }}
                className="h-[36px] border border-[#d8d9da] rounded-[10px] px-[12px] flex items-center gap-[7px] hover:bg-[#f7f8f8] transition-colors cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="none">
                  <path d="M12 2L9.09 9.09 2 12l7.09 2.91L12 22l2.91-7.09L22 12l-7.09-2.91L12 2z" fill="#004643"/>
                </svg>
                <span className="font-schibsted text-[13px] font-medium text-[#374151]">{selectedModelLabel}</span>
                <svg
                  className={`transition-transform ${modelMenuOpen ? "rotate-180" : ""}`}
                  width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                >
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
              {modelMenuOpen && (
                <div
                  style={{
                    position: "absolute",
                    ...(modelMenuOpensUp
                      ? { bottom: "100%", marginBottom: 6 }
                      : { top: "100%", marginTop: 6 }),
                    left: 0,
                    zIndex: 9999,
                    width: 180,
                    maxHeight: "min(260px, 60vh)",
                    overflowY: "auto",
                  }}
                  className="bg-white border border-[#d8d9da] rounded-[10px] shadow-[0px_4px_20px_rgba(0,0,0,0.1)]"
                >
                  {AI_MODEL_OPTIONS.map(model => (
                    <button
                      key={model.value}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSelectedModel(model.value);
                        setModelMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-[13px] font-medium text-[#374151] hover:bg-[#f5f7f8] transition-colors border-b border-[#f0f0f0] last:border-0 cursor-pointer"
                    >
                      {model.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* @ Mention */}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setMentionMenuOpen(v => !v);
                  setModelMenuOpen(false);
                }}
                className="w-[36px] h-[36px] border border-[#d8d9da] rounded-[10px] flex items-center justify-center hover:bg-[#f7f8f8] transition-colors cursor-pointer"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4"/>
                  <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/>
                </svg>
              </button>
              {mentionMenuOpen && (
                <div
                  style={{ position: "absolute", top: "100%", left: 0, marginTop: 6, zIndex: 9999, width: 180 }}
                  className="bg-white border border-[#d8d9da] rounded-[10px] shadow-[0px_4px_20px_rgba(0,0,0,0.1)] overflow-hidden"
                >
                  {["@Project_Alpha", "@JohnDoe", "@DesignTeam"].map(mention => (
                    <button
                      key={mention}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setPrompt(p => p + (p.length > 0 && !p.endsWith(" ") ? " " : "") + mention + " ");
                        setMentionMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-[13px] font-medium text-[#374151] hover:bg-[#f5f7f8] transition-colors border-b border-[#f0f0f0] last:border-0 cursor-pointer"
                    >
                      {mention}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right side: Mic + Generate */}
          <div className="flex items-center gap-[10px]">
            {/* Mic */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setIsRecording(v => !v);
              }}
              className={`w-[36px] h-[36px] flex items-center justify-center transition-all duration-300 cursor-pointer rounded-[10px] ${isRecording ? "bg-red-50 text-red-500 scale-110" : "opacity-60 hover:opacity-100 hover:bg-[#f7f8f8] text-[#374151]"}`}
            >
              <svg
                className={isRecording ? "animate-pulse" : ""}
                width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="22"/>
                <line x1="8" y1="22" x2="16" y2="22"/>
              </svg>
            </button>

            {/* Generate */}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!isPromptActive || isGenerating}
              className={`rounded-[10px] py-[9px] pl-[18px] pr-[14px] flex items-center gap-[8px] shadow-sm group transition-colors ${
                isPromptActive && !isGenerating
                  ? "bg-[#004643] hover:bg-[#003330] cursor-pointer"
                  : "bg-[#e5e5e5] cursor-not-allowed"
              }`}
            >
              <span className={`font-schibsted font-semibold text-[14px] leading-none whitespace-nowrap ${
                isPromptActive && !isGenerating ? "text-white" : "text-[#a3a3a3]"
              }`}>
                {isGenerating ? "Generating…" : "Build Now"}
              </span>
              {isGenerating ? (
                <Loader2 size={16} className="animate-spin text-white" />
              ) : (
                <svg
                  className="group-hover:translate-x-0.5 transition-transform"
                  width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke={isPromptActive ? "white" : "#a3a3a3"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                >
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Generated preview result ── */}
      {(isGenerating || generateError || generatedImageUrl) && (
        <div className="w-full">
          {isGenerating && (
            <div className="bg-white border border-[#d8d9da] rounded-[18px] px-6 py-8 flex flex-col items-center gap-3">
              <Loader2 size={22} className="animate-spin text-[#004643]" />
              <p className="text-[14px] text-[#6b7280] font-schibsted">Generating your design preview…</p>
            </div>
          )}

          {generateError && !isGenerating && (
            <div className="bg-[#fef2f2] border border-[#fecaca] rounded-[18px] px-6 py-4">
              <p className="text-[14px] text-[#b91c1c] font-schibsted">{generateError}</p>
            </div>
          )}

          {generatedImageUrl && !isGenerating && (
            <div className="bg-white border border-[#d8d9da] rounded-[18px] overflow-hidden shadow-[0px_20px_60px_rgba(0,0,0,0.07)]">
              <img src={generatedImageUrl} alt="AI-generated design preview" className="w-full h-auto block" />
              <div className="p-4 flex items-center justify-between">
                <p className="text-[13px] text-[#6b7280] font-schibsted">Like what you see? Sign up to save and keep editing.</p>
                <Link
                  href="/signup"
                  className="bg-[#004643] hover:bg-[#003330] text-white text-[13px] font-semibold font-schibsted px-4 py-2 rounded-full transition-colors whitespace-nowrap"
                >
                  Sign up free
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}