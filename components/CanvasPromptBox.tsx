"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function CanvasPromptBox() {
  const [designPrompt, setDesignPrompt] = useState("");
  const [attachedFile, setAttachedFile] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedModel, setSelectedModel] = useState("Gemini 3.1 Pro");
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [mentionMenuOpen, setMentionMenuOpen] = useState(false);

  const isPromptActive = designPrompt.trim() !== "" || attachedFile !== null;

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

            {/* Model Selector */}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setModelMenuOpen(v => !v);
                  setMentionMenuOpen(false);
                }}
                className="h-[28px] rounded-[8px] px-[6px] flex items-center gap-[5px] hover:bg-[#f5f5f5] transition-colors cursor-pointer"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L9.09 9.09 2 12l7.09 2.91L12 22l2.91-7.09L22 12l-7.09-2.91L12 2z" fill="#004643"/>
                </svg>
                <span className="text-[11.5px] font-medium text-[#374151]">{selectedModel}</span>
                <ChevronDown size={11} className={`text-[#a3a3a3] transition-transform ${modelMenuOpen ? "rotate-180" : ""}`} />
              </button>
              {modelMenuOpen && (
                <div
                  style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, width: 160, zIndex: 9999 }}
                  className="bg-white border border-[#e5e5e5] rounded-[8px] shadow-[0px_8px_24px_rgba(0,0,0,0.15)] overflow-hidden"
                >
                  {["Gemini 3.1 Pro", "Claude Sonnet 3.5", "GPT-4o"].map(model => (
                    <button
                      key={model}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSelectedModel(model);
                        setModelMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-[11px] font-medium text-[#374151] hover:bg-[#f5f5f5] transition-colors border-b border-[#f5f5f5] last:border-0 cursor-pointer"
                    >
                      {model}
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
                if (!isPromptActive) return;
                e.preventDefault();
                console.log("Generating:", designPrompt, attachedFile);
                setDesignPrompt("");
                setAttachedFile(null);
              }}
              disabled={!isPromptActive}
              className={`w-[28px] h-[28px] rounded-full flex items-center justify-center text-white transition-all duration-300 shadow-sm ${
                isPromptActive
                  ? "bg-[#004643] hover:bg-[#003330] cursor-pointer"
                  : "bg-[#e5e5e5] text-[#a3a3a3] cursor-not-allowed shadow-none"
              }`}
            >
              <svg
                width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className={isPromptActive ? "" : "opacity-60"}
              >
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
