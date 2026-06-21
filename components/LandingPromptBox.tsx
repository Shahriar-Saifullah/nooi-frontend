"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function LandingPromptBox() {
  const [prompt, setPrompt] = useState("");
  const [attachedFile, setAttachedFile] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedModel, setSelectedModel] = useState("Gemini 3.1 Pro");
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [mentionMenuOpen, setMentionMenuOpen] = useState(false);

  return (
    <div
      className="bg-white border border-[#d8d9da] rounded-[18px] shadow-[0px_20px_60px_rgba(0,0,0,0.07),0px_4px_16px_rgba(0,0,0,0.04)] w-full max-w-[900px] pt-[20px] pb-[14px] px-[20px] flex flex-col gap-[16px]"
      style={{ position: "relative", zIndex: 20 }}
      onWheel={(e) => e.stopPropagation()}
    >
      {/* Textarea */}
      <textarea
        placeholder="Create a landing page for a calendar app that helps design teams plan launches"
        className="w-full bg-transparent outline-none resize-none font-schibsted font-normal text-[17px] leading-[1.55] text-[#111d27] placeholder:text-[#a8adb3] min-h-[56px]"
        rows={2}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      {/* Attached file pill */}
      {attachedFile && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 text-[12px] text-[#004643] font-medium bg-[#eaf8f4] rounded-[6px] w-fit -mt-2 mb-2 border border-[#b2d9d1]">
          <span className="truncate max-w-[200px]">{attachedFile}</span>
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
                  setAttachedFile(e.target.files[0].name);
                }
              }}
            />
          </label>

          {/* AI Model Selector */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setModelMenuOpen(v => !v);
                setMentionMenuOpen(false);
              }}
              className="h-[36px] border border-[#d8d9da] rounded-[10px] px-[12px] flex items-center gap-[7px] hover:bg-[#f7f8f8] transition-colors cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="none">
                <path d="M12 2L9.09 9.09 2 12l7.09 2.91L12 22l2.91-7.09L22 12l-7.09-2.91L12 2z" fill="#004643"/>
              </svg>
              <span className="font-schibsted text-[13px] font-medium text-[#374151]">{selectedModel}</span>
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
                style={{ position: "absolute", top: "100%", left: 0, marginTop: 6, zIndex: 9999, width: 180 }}
                className="bg-white border border-[#d8d9da] rounded-[10px] shadow-[0px_4px_20px_rgba(0,0,0,0.1)] overflow-hidden"
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
                    className="w-full text-left px-4 py-2.5 text-[13px] font-medium text-[#374151] hover:bg-[#f5f7f8] transition-colors border-b border-[#f0f0f0] last:border-0 cursor-pointer"
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

        {/* Right side: Mic + Build Now */}
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

          {/* Build Now */}
          <Link
            href="/canvas"
            className="rounded-[10px] py-[9px] pl-[18px] pr-[14px] flex items-center gap-[8px] shadow-sm group transition-colors bg-[#004643] hover:bg-[#003330]"
          >
            <span className="font-schibsted font-semibold text-white text-[14px] leading-none whitespace-nowrap">
              Build Now
            </span>
            <svg
              className="group-hover:translate-x-0.5 transition-transform"
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
