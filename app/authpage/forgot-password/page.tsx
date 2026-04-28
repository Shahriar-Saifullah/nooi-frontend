"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "@/components/Button";
import { ChevronLeft } from "lucide-react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!email) {
      setError("Email is required");
      return;
    }

    if (!EMAIL_REGEX.test(email)) {
      setError("Please enter a valid email");
      return;
    }

    setError("");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Left panel */}
      <div className="w-115 bg-[#F3FEFD] flex flex-col justify-between px-12 py-12.75 overflow-y-auto">
        <div className="w-24 h-8">
          <img src="/Logo/Logo.svg" alt="Logo" />
        </div>

        <div className="mb-20">
          <h2 className="text-4xl italic font-light text-gray-800 mb-6 leading-tight">
            Calm your
            <br />
            workflow.
          </h2>
          <p className="text-gray-600 text-sm leading-relaxed pr-25">
            A focused workspace designed to reduce noise and help your team move
            with intention.
          </p>
        </div>
      </div>

      {/* Right Panel  */}
      <div className="flex-1 flex flex-col justify-center px-16 py-10 overflow-y-auto bg-white">
        <div className="mx-auto w-full max-w-md">
          <Link
            href="/authpage/signin"
            className="inline-flex items-center gap-1 text-[13px] text-[#646968] hover:text-gray-800 transition-colors"
          >
            <ChevronLeft className="size-4 text-[#646968] " />
            <span>Back to sign in</span>
          </Link>

          <div className="mt-9 mb-7">
            <h1 className="text-[26px] font-bold text-gray-900">
              Reset password
            </h1>
            <p className="text-[14px] text-gray-600">
              Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="space-y-5"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError("");
                }}
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent text-black ${
                  error
                    ? "border-red-400 focus:ring-red-300"
                    : "border-gray-300 focus:ring-teal-600"
                }`}
              />
              <p
                className={`text-red-500 text-xs mt-1 min-h-4 ${error ? "visible" : "invisible"}`}
              >
                {error || " "}
              </p>
            </div>

            <Button type="submit" fullWidth>
              Send reset link
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
