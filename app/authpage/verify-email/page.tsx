"use client";

import Link from "next/link";
import Button from "@/components/Button";
import { Mail } from "lucide-react";

export default function VerifyEmailPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Left panel */}
      <div className="hidden md:flex w-115 bg-[#F3FEFD] flex-col justify-between px-12 py-12.75 overflow-y-auto">
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

      {/* Right Panel */}
      <div className="flex-1 flex flex-col justify-center px-6 md:px-16 py-10 overflow-y-auto bg-white">
        <div className="mx-auto w-full max-w-md ">
          {/* Mail icon */}
          <div className="w-14 h-14 rounded-2xl bg-[#E6FAF8] border border-[#A8E6E0] flex items-center justify-center mx-auto mb-6">
            <Mail className="size-6 text-teal-600" />
          </div>

          {/* Heading */}
          <h1 className="text-[26px] font-bold text-center text-gray-900 mb-2">
            Verify your email
          </h1>
          <p className="text-[14px] text-center text-gray-600 mb-6">
            We sent a verification link to your email.
            <br />
            Click it to activate your account.
          </p>

          {/* Info box */}
          <div className="border border-gray-200 rounded-xl px-5 py-4 mb-6">
            <ul className="space-y-2">
              {[
                "Link expires in 24 hours",
                "Check your spam folder if not found",
                "Only one link is active at a time",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-[13px] text-gray-600"
                >
                  <span className="size-1.5 rounded-full bg-gray-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Resend button */}
          <Button variant="social" fullWidth>
            Resend verification email
          </Button>

          {/* Start over */}
          <p className="text-center text-[13px] text-gray-500 mt-5">
            Wrong email?{" "}
            <Link
              href="/authpage/signup"
              className="text-teal-600 hover:text-teal-700 font-medium"
            >
              Start over
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
