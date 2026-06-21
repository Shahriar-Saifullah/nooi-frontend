"use client";

import React, { useState, useRef } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { generateRender, AI_MODEL_OPTIONS, type AiModel } from "@/lib/api/projects";

interface CanvasPromptBoxProps {
  projectId: string | undefined;
  onGenerateStart?: () => void;
  onGenerateSuccess?: (imageUrl: string) => void;
  onGenerateError?: (message: string) => void;
}

export default function CanvasPromptBox({
  projectId,
  onGenerateStart,
  onGenerateSuccess,
  onGenerateError,
}: CanvasPromptBoxProps) {
  const [designPrompt, setDesignPrompt] = useState("");
  const [attachedFile, setAttachedFile] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AiModel>("gemini");
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [modelMenuOpensUp, setModelMenuOpensUp] = useState(false);
  const modelButtonRef = useRef<HTMLButtonElement>(null);
  const [mentionMenuOpen, setMentionMenuOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const isPromptActive = designPrompt.trim() !== "" || attachedFile !== null;
  const selectedModelLabel = AI_MODEL_OPTIONS.find(m => m.value === selectedModel)?.label ?? "Gemini";

  const handleGenerate = async () => {
    if (!isPromptActive || isGenerating) return;

    if (!projectId) {
      onGenerateError?.("No project loaded yet — try again in a moment.");
      return;
    }

    const promptToSend = designPrompt;
    setDesignPrompt("");
    setAttachedFile(null);
    setIsGenerating(true);
    onGenerateStart?.();

    try {
      const result = await generateRender(projectId, promptToSend, selectedModel);
      onGenerateSuccess?.(result.image_url);
    } catch (err: any) {
      onGenerateError?.(err.message || "Failed to generate image. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="px-3 pb-4" style={{ position: "relative", zIndex: 50 }}>
      <div
        className="border border-[#e5e5e5] rounded-[14px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex flex-col gap-[10px] pt-[12px] pb-[10px] px-[12px]"
        style={{ overflow: "visible" }}
      >
        {/* Textarea */}
        <textarea
          value={designPrompt}
          onChange={(e) => setDesignPrompt(e.target.value)}
          placeholder="Describe your design vision..."
          className="w-full resize-none text-[12px] leading-[1.55] text-[#0a0a0a] placeholder:text-[#a3a3a3] focus:outline-none bg-transparent select-text"
          rows={2}
          disabled={isGenerating}
        />

        {/* Attached file pill */}
        {attachedFile && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-[#004643] font-medium bg-[#eaf8f4] rounded-[6px] w-fit">
            <span className="truncate max-w-[160px]">{attachedFile}</span>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); setAttachedFile(null); }}
              className="text-[#a3a3a3] hover:text-red-500 font-bold ml-0.5"
            >
              ×
            </button>
          </div>
        )}

        {/* Bottom toolbar */}
        <div
          className="flex items-center justify-between mt-1"
          style={{ position: "relative", zIndex: 9999, overflow: "visible" }}
        >
          {/* Left: Paperclip + Model Selector + @ */}
          <div className="flex items-center gap-[6px]">
            {/* Paperclip / Upload */}
            <label className="w-[28px] h-[28px] rounded-[8px] flex items-center justify-center hover:bg-[#f5f5f5] transition-colors cursor-pointer text-[#6b7280]">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setAttachedFile(e.target.files[0].name);
                  }
                }}
              />
            </label>

            {/* Model Selector — placeholder labels for now; every option routes to
                the same Gemini image model on the backend until per-provider
                routing is built (see generateRenderSchema comment) */}
            <div style={{ position: "relative" }}>
              <button
                ref={modelButtonRef}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (!modelMenuOpen && modelButtonRef.current) {
                    const rect = modelButtonRef.current.getBoundingClientRect();
                    const spaceBelow = window.innerHeight - rect.bottom;
                    const estimatedMenuHeight = 200; // ~5 items at ~40px each
                    setModelMenuOpensUp(spaceBelow < estimatedMenuHeight);
                  }
                  setModelMenuOpen(v => !v);
                  setMentionMenuOpen(false);
                }}
                className="h-[28px] rounded-[8px] px-[6px] flex items-center gap-[5px] hover:bg-[#f5f5f5] transition-colors cursor-pointer"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L9.09 9.09 2 12l7.09 2.91L12 22l2.91-7.09L22 12l-7.09-2.91L12 2z" fill="#004643"/>
                </svg>
                <span className="text-[11.5px] font-medium text-[#374151]">{selectedModelLabel}</span>
                <ChevronDown size={11} className={`text-[#a3a3a3] transition-transform ${modelMenuOpen ? "rotate-180" : ""}`} />
              </button>
              {modelMenuOpen && (
                <div
                  style={{
                    position: "absolute",
                    ...(modelMenuOpensUp
                      ? { bottom: "100%", marginBottom: 4 }
                      : { top: "100%", marginTop: 4 }),
                    left: 0,
                    width: 160,
                    zIndex: 9999,
                    maxHeight: "min(240px, 60vh)",
                    overflowY: "auto",
                  }}
                  className="bg-white border border-[#e5e5e5] rounded-[8px] shadow-[0px_8px_24px_rgba(0,0,0,0.15)]"
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
                      className="w-full text-left px-3 py-2 text-[11px] font-medium text-[#374151] hover:bg-[#f5f5f5] transition-colors border-b border-[#f5f5f5] last:border-0 cursor-pointer"
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
                className="w-[28px] h-[28px] rounded-[8px] flex items-center justify-center hover:bg-[#f5f5f5] transition-colors text-[#6b7280] cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4"/>
                  <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/>
                </svg>
              </button>
              {mentionMenuOpen && (
                <div
                  style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, width: 160, zIndex: 9999 }}
                  className="bg-white border border-[#e5e5e5] rounded-[8px] shadow-[0px_8px_24px_rgba(0,0,0,0.15)] overflow-hidden"
                >
                  {["@Project_Alpha", "@JohnDoe", "@DesignTeam"].map(mention => (
                    <button
                      key={mention}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setDesignPrompt(p => p + (p.length > 0 && !p.endsWith(" ") ? " " : "") + mention + " ");
                        setMentionMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-[11px] font-medium text-[#374151] hover:bg-[#f5f5f5] transition-colors border-b border-[#f5f5f5] last:border-0 cursor-pointer"
                    >
                      {mention}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Mic + Send */}
          <div className="flex items-center gap-[6px]">
            {/* Mic */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setIsRecording(v => !v);
              }}
              className={`w-[28px] h-[28px] rounded-[8px] flex items-center justify-center transition-all duration-300 cursor-pointer ${
                isRecording
                  ? "opacity-100 scale-110 bg-red-50 text-red-500"
                  : "opacity-60 hover:opacity-100 hover:bg-[#f5f5f5] text-[#374151]"
              }`}
            >
              <svg
                className={isRecording ? "animate-pulse" : ""}
                width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="22"/>
                <line x1="8" y1="22" x2="16" y2="22"/>
              </svg>
            </button>

            {/* Send / Generate */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleGenerate();
              }}
              disabled={!isPromptActive || isGenerating}
              className={`w-[28px] h-[28px] rounded-full flex items-center justify-center text-white transition-all duration-300 shadow-sm ${
                isPromptActive && !isGenerating
                  ? "bg-[#004643] hover:bg-[#003330] cursor-pointer"
                  : "bg-[#e5e5e5] text-[#a3a3a3] cursor-not-allowed shadow-none"
              }`}
            >
              {isGenerating ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <svg
                  width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className={isPromptActive ? "" : "opacity-60"}
                >
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}