"use client";
import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getGoogleAuthUrl, signIn } from "@/lib/api/auth";
import Button from "@/components/Button";

function GoogleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

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
};

function SigninPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    auth?: string;
  }>({});

  useEffect(() => {
    const errorCode = searchParams.get("error");
    if (errorCode) {
      setErrors({ auth: OAUTH_ERROR_MESSAGES[errorCode] ?? "Sign in failed. Please try again." });
    }
  }, [searchParams]);

  const validate = () => {
    const next: typeof errors = {};
    if (!email) next.email = "Email is required";
    else if (!EMAIL_REGEX.test(email))
      next.email = "Please enter a valid email";
    if (!password) next.password = "Password is required";
    else if (password.length < 6)
      next.password = "Password must be at least 6 characters";
    return next;
  };

  const handleSignIn = async () => {
    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    const res = await signIn({ email, password });
    setSubmitting(false);

    if (!res.success) {
      const nextFieldErrors = extractFieldErrors(res.error);
      const authMessage =
        typeof res.error === "string" ? res.error : "Sign in failed";
      setErrors({ ...nextFieldErrors, auth: authMessage });
      return;
    }

    const onboardingCompleted = !!res.data.user.onboarding_completed;
    router.push(onboardingCompleted ? "/dashboard" : "/onboarding");
  };

  const handleGoogleAuth = () => {
    window.location.href = getGoogleAuthUrl();
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

      {/* Right panel */}
      <div className="flex-1 flex flex-col justify-center px-16 py-10 overflow-y-auto">
        <div className="max-w-md mx-auto w-full">
          <div
            className={`transition-transform duration-200 ${
              errors.auth ? "translate-y-1" : "translate-y-0"
            }`}
          >
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Sign in</h1>
              <p className="text-gray-600 text-sm">
                Welcome back. Enter your details to continue.
              </p>
            </div>

            <div
              className={`overflow-hidden transition-all duration-700 ease-out ${
                errors.auth
                  ? "max-h-28 opacity-100 translate-y-0 mb-6"
                  : "max-h-0 opacity-0 -translate-y-1 mb-0"
              }`}
            >
              <div className="flex bg-red-50 border border-red-200 rounded-lg px-4 py-3  gap-2">
                <span className="text-red-500 text-base leading-none mt-0.5 shrink-0 ">
                  ●
                </span>
                <div>
                  <p className="text-red-700 font-semibold text-sm ">
                    Sign in failed
                  </p>
                  <p className="text-red-600 text-xs mt-0.5">
                    {errors.auth ?? " "}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <form className="space-y-3">
            {/* Email */}
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
                  if (errors.email || errors.auth)
                    setErrors((p) => ({
                      ...p,
                      email: undefined,
                      auth: undefined,
                    }));
                }}
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent text-black ${
                  errors.email
                    ? "border-red-400 focus:ring-red-300"
                    : "border-gray-300 focus:ring-teal-600"
                }`}
              />
              <p
                className={`text-red-500 text-xs mt-1 min-h-4 ${
                  errors.email ? "visible" : "invisible"
                }`}
              >
                {errors.email ?? " "}
              </p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
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
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent text-black ${
                  errors.password
                    ? "border-red-400 focus:ring-red-300"
                    : "border-gray-300 focus:ring-teal-600"
                }`}
              />
              <p
                className={`text-red-500 text-xs mt-1 min-h-4 ${
                  errors.password ? "visible" : "invisible"
                }`}
              >
                {errors.password ?? " "}
              </p>
              <div className="text-right">
                <a
                  href="/authpage/forgot-password"
                  className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                >
                  Forgot password?
                </a>
              </div>
            </div>

            {/* Sign in Button */}
            <Button
              type="button"
              onClick={handleSignIn}
              fullWidth
              disabled={submitting}
            >
              {submitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="text-gray-500 text-sm">or</span>
            <div className="flex-1 border-t border-gray-300"></div>
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

          {/* Sign up link */}
          <div className="text-center mt-6">
            <span className="text-gray-600 text-sm">
              Don&apos;t have an account?{" "}
              <Button
                type="button"
                variant="text"
                onClick={() => router.push("/authpage/signup")}
              >
                Create one
              </Button>
            </span>
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
