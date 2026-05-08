"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Eye, EyeOff, TriangleAlert } from "lucide-react";
import Button from "@/components/Button";
import { forgotPassword } from "@/lib/api/auth";

function getStrength(password: string): {
    score: number;
    label: string;
    color: string;
} {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score === 0) return { score: 0, label: "", color: "" };
    if (score === 1) return { score: 1, label: "Weak", color: "bg-red-400" };
    if (score === 2) return { score: 2, label: "Fair", color: "bg-orange-400" };
    if (score === 3) return { score: 3, label: "Good", color: "bg-yellow-400" };
    return { score: 4, label: "Strong", color: "bg-teal-500" };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ResetPasswordInner() {
    const router = useRouter();

    const [accessToken, setAccessToken] = useState("");
    const [refreshToken, setRefreshToken] = useState("");
    const [ready, setReady] = useState(false);
    const [exchangeError, setExchangeError] = useState(false);

    // For invalid link — resend form
    const [resendEmail, setResendEmail] = useState("");
    const [resendError, setResendError] = useState("");
    const [resendSending, setResendSending] = useState(false);
    const [resendSent, setResendSent] = useState(false);

    // For valid link — reset form
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const strength = getStrength(password);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        if (!access_token || !refresh_token) {
            setExchangeError(true);
            return;
        }

        setAccessToken(access_token);
        setRefreshToken(refresh_token);
        setReady(true);
    }, []);

    const handleResend = async () => {
        if (!resendEmail) {
            setResendError("Email is required");
            return;
        }
        if (!EMAIL_REGEX.test(resendEmail)) {
            setResendError("Please enter a valid email");
            return;
        }

        setResendError("");
        setResendSending(true);
        const res = await forgotPassword({ email: resendEmail });
        setResendSending(false);

        if (!res.success) {
            setResendError(
                typeof res.error === "string"
                    ? res.error
                    : "Something went wrong. Please try again."
            );
            return;
        }

        setResendSent(true);
    };

    const handleSubmit = async () => {
        if (!password) { setError("Password is required"); return; }
        if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
        if (password !== confirmPassword) { setError("Passwords do not match"); return; }

        setError("");
        setSubmitting(true);

        const res = await fetch(
            `${process.env.NEXT_PUBLIC_AUTH_API_URL}/reset-password`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    token: accessToken,
                    refresh_token: refreshToken,
                    new_password: password,
                }),
            }
        );

        const data = await res.json();
        setSubmitting(false);

        if (!data.success) {
            setError(data.error ?? "Something went wrong. Please try again.");
            return;
        }

        window.location.href = "/authpage/signin?reset=success";
    };

    return (
        <div className="flex h-screen overflow-hidden bg-white">
            {/* Left panel */}
            <div className="hidden md:flex w-115 bg-[#F3FEFD] flex-col justify-between px-12 py-12 overflow-y-auto">
                <div className="w-24 h-8">
                    <a href="/">
                        <img src="/Logo/Logo.svg" alt="Logo" />
                    </a>
                </div>
                <div className="mb-20">
                    <h2 className="text-4xl italic font-light text-gray-800 mb-6 leading-tight">
                        Calm your
                        <br />
                        workflow.
                    </h2>
                    <p className="text-gray-600 text-sm leading-relaxed pr-25">
                        A focused workspace designed to reduce noise and help your team
                        move with intention.
                    </p>
                </div>
            </div>

            {/* Right panel */}
            <div className="flex-1 flex flex-col justify-center px-6 md:px-16 py-10 overflow-y-auto bg-white">
                <div className="mx-auto w-full max-w-md">

                    {/* Invalid / Expired link state */}
                    {exchangeError && (
                        <>
                            <Link
                                href="/authpage/signin"
                                className="inline-flex items-center gap-1 text-[13px] text-[#646968] hover:text-gray-800 transition-colors mb-8"
                            >
                                <ChevronLeft className="size-4" />
                                Back to sign in
                            </Link>

                            {resendSent ? (
                                <div className="text-center space-y-2">
                                    <div className="w-14 h-14 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center mx-auto mb-4">
                                        <span className="text-teal-600 text-2xl">✓</span>
                                    </div>
                                    <h1 className="text-[22px] font-bold text-gray-900">Check your inbox</h1>
                                    <p className="text-[14px] text-gray-600">
                                        We sent a new password reset link to <span className="font-semibold text-gray-900">{resendEmail}</span>
                                    </p>
                                    <p className="text-[13px] text-gray-500 mt-4">
                                        Didn&apos;t receive it?{" "}
                                        <button
                                            onClick={() => { setResendSent(false); setResendEmail(""); }}
                                            className="text-teal-600 hover:text-teal-700 font-medium"
                                        >
                                            Try again
                                        </button>
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* Warning icon */}
                                    <div className="w-16 h-16 rounded-full bg-yellow-50 border border-yellow-200 flex items-center justify-center mx-auto mb-6">
                                        <TriangleAlert className="size-7 text-yellow-500" />
                                    </div>

                                    <h1 className="text-[22px] font-bold text-gray-900 text-center mb-2">
                                        Invalid reset link
                                    </h1>
                                    <p className="text-[14px] text-gray-600 text-center mb-8">
                                        This password reset link is invalid or has expired. Please request a new one.
                                    </p>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Email
                                            </label>
                                            <input
                                                type="email"
                                                placeholder="you@company.com"
                                                value={resendEmail}
                                                onChange={(e) => {
                                                    setResendEmail(e.target.value);
                                                    if (resendError) setResendError("");
                                                }}
                                                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent text-black ${resendError
                                                    ? "border-red-400 focus:ring-red-300"
                                                    : "border-gray-300 focus:ring-teal-600"
                                                    }`}
                                            />
                                            {resendError && (
                                                <p className="text-red-500 text-xs mt-1">{resendError}</p>
                                            )}
                                        </div>

                                        <Button
                                            type="button"
                                            fullWidth
                                            onClick={handleResend}
                                            disabled={resendSending}
                                        >
                                            {resendSending ? "Sending..." : "Send reset link"}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </>
                    )}

                    {/* Valid link — Reset form */}
                    {ready && (
                        <>
                            <Link
                                href="/authpage/signin"
                                className="inline-flex items-center gap-1 text-[13px] text-[#646968] hover:text-gray-800 transition-colors"
                            >
                                <ChevronLeft className="size-4" />
                                Back to sign in
                            </Link>

                            <div className="mt-9 mb-7">
                                <h1 className="text-[26px] font-bold text-gray-900">
                                    Create new password
                                </h1>
                                <p className="text-[14px] text-gray-600">
                                    Your new password must be different from previously used passwords.
                                </p>
                            </div>

                            <div className="space-y-5">
                                {/* Password */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Create a strong password"
                                            value={password}
                                            onChange={(e) => { setPassword(e.target.value); if (error) setError(""); }}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent text-black pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((p) => !p)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                        </button>
                                    </div>
                                    {password && (
                                        <div className="mt-2">
                                            <div className="flex gap-1 mb-1">
                                                {[1, 2, 3, 4].map((i) => (
                                                    <div
                                                        key={i}
                                                        className={`h-1 flex-1 rounded-full transition-all ${i <= strength.score ? strength.color : "bg-gray-200"}`}
                                                    />
                                                ))}
                                            </div>
                                            <p className={`text-xs font-medium ${strength.score === 1 ? "text-red-400" :
                                                strength.score === 2 ? "text-orange-400" :
                                                    strength.score === 3 ? "text-yellow-500" :
                                                        "text-teal-500"}`}>
                                                {strength.label}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Confirm password */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Confirm Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showConfirm ? "text" : "password"}
                                            placeholder="Confirm password"
                                            value={confirmPassword}
                                            onChange={(e) => { setConfirmPassword(e.target.value); if (error) setError(""); }}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent text-black pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirm((p) => !p)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                        </button>
                                    </div>
                                </div>

                                {error && <p className="text-red-500 text-xs">{error}</p>}

                                <Button
                                    type="button"
                                    fullWidth
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                >
                                    {submitting ? "Resetting..." : "Reset Password"}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={null}>
            <ResetPasswordInner />
        </Suspense>
    );
}