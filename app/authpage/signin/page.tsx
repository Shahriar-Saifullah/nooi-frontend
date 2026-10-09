"use client";
import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithGoogle, signIn } from "@/lib/api/auth";
import Button from "@/components/Button";
import GoogleIcon from "@/components/GoogleIcon";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = Partial<{
  email: string;
  password: string;
}>;

function extractFieldErrors(error: unknown): FieldErrors {
  if (!error || typeof error !== "object") return {};
  const fieldErrors = (error as { fieldErrors?: unknown }).fieldErrors;
  if (!fieldErrors || typeof fieldErrors !== "object") return {};

  const email = (fieldErrors as { email?: unknown }).email;
  const password = (fieldErrors as { password?: unknown }).password;

  return {
    email:
      Array.isArray(email) && typeof email[0] === "string"
        ? email[0]
        : undefined,
    password:
      Array.isArray(password) && typeof password[0] === "string"
        ? password[0]
        : undefined,
  };
}

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  google_auth_failed: "Google sign in failed. Please try again.",
  missing_code: "Google sign in failed. Please try again.",
  missing_verifier: "Google sign in failed. Please try again.",
  server_error: "Something went wrong on our end. Please try again.",
};

function SigninPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [resetSuccess, setResetSuccess] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    auth?: string;
  }>({});

  useEffect(() => {
    // Check if this is a password recovery redirect
    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery")) {
      const params = new URLSearchParams(hash.substring(1));
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      if (access_token && refresh_token) {
        router.replace(
          `/authpage/reset-password?access_token=${access_token}&refresh_token=${refresh_token}`
        );
        return;
      }
    }

    const errorCode = searchParams.get("error");
    if (errorCode) {
      setErrors({ auth: OAUTH_ERROR_MESSAGES[errorCode] ?? "Sign in failed. Please try again." });
    }
    const reset = searchParams.get("reset");
    if (reset === "success") {
      setResetSuccess(true);
    }
  }, [searchParams, router]);

  const validate = () => {
    const next: typeof errors = {};
    if (!email.trim()) next.email = "Email is required";
    else if (!EMAIL_REGEX.test(email.trim()))
      next.email = "Please enter a valid email address";
    if (!password) next.password = "Password is required";
    else if (password.length < 6)
      next.password = "Password must be at least 6 characters";
    return next;
  };

  const handleSignIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    setErrors({});
    const res = await signIn({ email: email.trim(), password });
    setSubmitting(false);

    if (!res.success) {
      if ((res.error as any)?.code === "EMAIL_NOT_VERIFIED") {
        router.push(
          `/authpage/verify-email?email=${encodeURIComponent(email.trim())}`
        );
        return;
      }
      const nextFieldErrors = extractFieldErrors(res.error);
      const authMessage =
        typeof res.error === "string" ? res.error : "Sign in failed. Invalid credentials.";
      setErrors({ ...nextFieldErrors, auth: authMessage });
      return;
    }

    // 1. Explicit destination param overrides default routing
    const next = searchParams.get("next");
    if (next && next.startsWith("/") && !next.startsWith("//")) {
      router.push(next);
      return;
    }

    // 2. Unified Role-Based Routing
    const user = res.data.user;
    const role = user.role;

    if (role === "admin" || role === "super_admin") {
      router.push("/admin");
      return;
    }

    if (role === "vendor") {
      const status = user.vendor_status;
      if (status === "approved") {
        router.push("/sell/dashboard");
      } else if (status === "action_needed") {
        router.push("/sell/action-needed");
      } else if (status === "rejected") {
        router.push("/sell/not-approved");
      } else if (status === "pending") {
        router.push("/sell/submitted");
      } else if (status === "draft") {
        router.push("/sell/onboarding");
      } else {
        router.push("/sell/dashboard");
      }
      return;
    }

    // Default Customer / User role
    const onboardingCompleted = !!user.onboarding_completed;
    router.push(onboardingCompleted ? "/dashboard" : "/onboarding");
  };

  const handleGoogleAuth = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      setErrors({ auth: "Google sign in failed. Please try again." });
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Left panel */}
      <div className="hidden md:flex w-115 bg-[#F3FEFD] flex-col justify-between px-12 py-12.75 overflow-y-auto border-r border-gray-100">
        <div className="w-24 h-8">
          <a href="/">
            <img src="/Logo/Logo.svg" alt="Nooi" />
          </a>
        </div>

        <div className="mb-20">
          <h2 className="text-4xl italic font-serif text-gray-900 mb-6 leading-tight font-instrument">
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

      {/* Right panel */}
      <div className="flex-1 flex flex-col justify-center px-6 md:px-16 py-10 overflow-y-auto">
        <div className="max-w-md mx-auto w-full">
          <div
            className={`transition-transform duration-200 ${errors.auth ? "translate-y-1" : "translate-y-0"
              }`}
          >
            {resetSuccess && (
              <div className="flex items-center gap-2 text-[13px] text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-4 py-3 mb-6">
                <span>✓</span>
                <span>Password reset successfully! Sign in with your new password.</span>
              </div>
            )}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">
                Sign in
              </h1>
              <p className="text-gray-600 text-sm">
                Welcome back. Enter your credentials to access your account.
              </p>
            </div>

            <div
              className={`overflow-hidden transition-all duration-500 ease-out ${errors.auth
                ? "max-h-28 opacity-100 translate-y-0 mb-6"
                : "max-h-0 opacity-0 -translate-y-1 mb-0"
                }`}
            >
              <div className="flex bg-red-50 border border-red-200 rounded-lg px-4 py-3 gap-2">
                <span className="text-red-500 text-base leading-none mt-0.5 shrink-0 ">
                  ●
                </span>
                <div>
                  <p className="text-red-700 font-semibold text-sm">
                    Sign in failed
                  </p>
                  <p className="text-red-600 text-xs mt-0.5">
                    {errors.auth ?? " "}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Single Unified Form */}
          <form className="space-y-4" onSubmit={handleSignIn}>
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email || errors.auth)
                    setErrors((p) => ({
                      ...p,
                      email: undefined,
                      auth: undefined,
                    }));
                }}
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 text-black ${errors.email
                  ? "border-red-400 focus:ring-red-300"
                  : "border-gray-300 focus:border-[#004643] focus:ring-[#004643]/20"
                  }`}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password || errors.auth)
                    setErrors((p) => ({
                      ...p,
                      password: undefined,
                      auth: undefined,
                    }));
                }}
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 text-black ${errors.password
                  ? "border-red-400 focus:ring-red-300"
                  : "border-gray-300 focus:border-[#004643] focus:ring-[#004643]/20"
                  }`}
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password}</p>
              )}
              <div className="text-right mt-1.5">
                <a
                  href="/authpage/forgot-password"
                  className="text-xs text-teal-700 hover:text-teal-800 font-medium"
                >
                  Forgot password?
                </a>
              </div>
            </div>

            {/* Sign in Button */}
            <Button
              type="submit"
              fullWidth
              disabled={submitting}
            >
              {submitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 border-t border-gray-200"></div>
            <span className="text-gray-400 text-xs uppercase tracking-wider font-medium">or</span>
            <div className="flex-1 border-t border-gray-200"></div>
          </div>

          {/* Google Button */}
          <Button
            type="button"
            variant="social"
            fullWidth
            onClick={handleGoogleAuth}
          >
            <GoogleIcon />
            <span>Continue with Google</span>
          </Button>

          {/* Sign up links */}
          <div className="text-center mt-6 space-y-2.5">
            <div>
              <span className="text-xs text-gray-600">
                Don&apos;t have an account?{" "}
                <Button
                  type="button"
                  variant="text"
                  className="font-semibold text-[#004643] hover:underline text-xs"
                  onClick={() => router.push("/authpage/signup")}
                >
                  Create one
                </Button>
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-600">
                Want to sell furniture on Nooi?{" "}
                <Button
                  type="button"
                  variant="text"
                  className="font-semibold text-[#004643] hover:underline text-xs"
                  onClick={() => router.push("/sell")}
                >
                  Register your store
                </Button>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SigninPage() {
  return (
    <Suspense fallback={null}>
      <SigninPageInner />
    </Suspense>
  );
}
