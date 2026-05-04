"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { getGoogleAuthUrl, signUp } from "@/lib/api/auth";
import Button from "@/components/Button";
import GoogleIcon from "@/components/GoogleIcon";

function getStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;
  if (!password) return { score: 0, label: "Strength", color: "#9CA3AF" };
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { score: 1, label: "Weak", color: "#ef4444" };
  if (score === 2) return { score: 2, label: "Fair", color: "#f97316" };
  if (score === 3) return { score: 3, label: "Good", color: "#ca8a04" };
  return { score: 4, label: "Strong", color: "#16a34a" };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = Partial<{
  fullName: string;
  email: string;
  password: string;
}>;

function extractFieldErrors(error: unknown): FieldErrors {
  if (!error || typeof error !== "object") return {};
  const fieldErrors = (error as { fieldErrors?: unknown }).fieldErrors;
  if (!fieldErrors || typeof fieldErrors !== "object") return {};

  const fullName = (fieldErrors as { full_name?: unknown }).full_name;
  const email = (fieldErrors as { email?: unknown }).email;
  const password = (fieldErrors as { password?: unknown }).password;

  return {
    fullName:
      Array.isArray(fullName) && typeof fullName[0] === "string"
        ? fullName[0]
        : undefined,
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

export default function SignupPage() {
  const router = useRouter();
  const signupData = useAuthStore((state) => state.signupData);
  const setSignupData = useAuthStore((state) => state.setSignupData);
  const resetSignupData = useAuthStore((state) => state.resetSignupData);
  const password = signupData.password;
  const [submitting, setSubmitting] = useState(false);

  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  useEffect(() => {
    useAuthStore.persist.rehydrate();
  }, []);

  const strength = getStrength(password);

  const validate = () => {
    const next: typeof errors = {};
    if (!signupData.fullName.trim()) next.fullName = "Full name is required";
    if (!signupData.email) next.email = "Email is required";
    else if (!EMAIL_REGEX.test(signupData.email))
      next.email = "Please enter a valid email";
    if (!signupData.password) next.password = "Password is required";
    else if (signupData.password.length < 8)
      next.password = "Must be at least 8 characters";
    else if (!/[A-Z]/.test(signupData.password))
      next.password = "Must include an uppercase letter";
    else if (!/[0-9]/.test(signupData.password))
      next.password = "Must include a number";
    if (!signupData.confirmPassword)
      next.confirmPassword = "Please confirm your password";
    else if (signupData.password !== signupData.confirmPassword)
      next.confirmPassword = "Passwords do not match";
    return next;
  };

  const handleCreateAccount = async () => {
    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    const res = await signUp({
      fullName: signupData.fullName,
      email: signupData.email,
      password: signupData.password,
    });
    setSubmitting(false);

    if (!res.success) {
      if (typeof res.error === "string") {
        const message = res.error;
        setErrors((prev) => ({ ...prev, email: message }));
        return;
      }

      const nestedError = (res.error as { fieldErrors?: unknown })?.fieldErrors
        ? res.error
        : (res.error as { error?: unknown })?.error;

      const nextFieldErrors = extractFieldErrors(nestedError);
      if (
        nextFieldErrors.fullName ||
        nextFieldErrors.email ||
        nextFieldErrors.password
      ) {
        setErrors((prev) => ({ ...prev, ...nextFieldErrors }));
        return;
      }

      setErrors((prev) => ({ ...prev, email: "Sign up failed" }));
      return;
    }

    const verifiedEmail = signupData.email;
    resetSignupData();
    router.push(`/authpage/verify-email?email=${encodeURIComponent(verifiedEmail)}`);
  };

  const handleGoogleAuth = () => {
    window.location.href = getGoogleAuthUrl();
  };

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

      {/* Right panel */}
      <div className="flex-1 flex flex-col justify-center px-6 md:px-16 py-10 overflow-y-auto bg-white">
        <div className="max-w-md mx-auto w-full">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Create account
            </h1>
            <p className="text-gray-600 text-sm">
              Get started for free. No credit card required.
            </p>
          </div>

          {/* Form */}
          <form className="-space-y-1">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full name
              </label>
              <input
                type="text"
                placeholder="Ada Lovelace"
                value={signupData.fullName}
                onChange={(e) => {
                  setSignupData({ fullName: e.target.value });
                  if (errors.fullName)
                    setErrors((p) => ({ ...p, fullName: undefined }));
                }}
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent text-black ${errors.fullName
                    ? "border-red-400 focus:ring-red-300"
                    : "border-gray-300 focus:ring-teal-600"
                  }`}
              />
              <p
                className={`text-red-500 text-xs text-right mt-1 min-h-4 ${errors.fullName ? "visible" : "invisible"
                  }`}
              >
                {errors.fullName ?? " "}
              </p>
            </div>

            {/* Work Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Work email
              </label>
              <input
                type="email"
                placeholder="ada@company.com"
                value={signupData.email}
                onChange={(e) => {
                  setSignupData({ email: e.target.value });
                  if (errors.email)
                    setErrors((p) => ({ ...p, email: undefined }));
                }}
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent text-black ${errors.email
                    ? "border-red-400 focus:ring-red-300"
                    : "border-gray-300 focus:ring-teal-600"
                  }`}
              />
              <p
                className={`text-red-500 text-xs text-right mt-1 min-h-4 ${errors.email ? "visible" : "invisible"
                  }`}
              >
                {errors.email ?? " "}
              </p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => {
                  setSignupData({ password: e.target.value });
                  if (errors.password)
                    setErrors((p) => ({ ...p, password: undefined }));
                }}
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent text-black ${errors.password
                    ? "border-red-400 focus:ring-red-300"
                    : "border-gray-300 focus:ring-teal-600"
                  }`}
              />
              <p
                className={`text-red-500 text-xs text-right mt-1 min-h-4 ${errors.password ? "visible" : "invisible"
                  }`}
              >
                {errors.password ?? " "}
              </p>
              {/* PASSWORD SECTION - STRENGTH INDICATOR */}
              <div className="flex items-center justify-start -mt-1 mb-3 gap-2 w-full">
                {/* BAR 1 */}
                <div
                  className="h-1 flex-1 rounded-full transition-colors"
                  style={{
                    backgroundColor:
                      strength.score >= 1 ? strength.color : "#D1D5DB",
                  }}
                />
                {/* BAR 2 */}
                <div
                  className="h-1 flex-1 rounded-full transition-colors"
                  style={{
                    backgroundColor:
                      strength.score >= 2 ? strength.color : "#D1D5DB",
                  }}
                />
                {/* BAR 3 */}
                <div
                  className="h-1 flex-1 rounded-full transition-colors"
                  style={{
                    backgroundColor:
                      strength.score >= 3 ? strength.color : "#D1D5DB",
                  }}
                />
                {/* BAR 4 */}
                <div
                  className="h-1 flex-1 rounded-full transition-colors"
                  style={{
                    backgroundColor:
                      strength.score >= 4 ? strength.color : "#D1D5DB",
                  }}
                />
                {/* PASSWORD STRENGTH LABEL */}
                <span
                  className="text-xs font-medium ml-2 transition-colors whitespace-nowrap"
                  style={{ color: strength.color }}
                >
                  {strength.label}
                </span>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                placeholder="Confirm password"
                value={signupData.confirmPassword}
                onChange={(e) => {
                  setSignupData({
                    ...signupData,
                    confirmPassword: e.target.value,
                  });
                  if (errors.confirmPassword)
                    setErrors((p) => ({ ...p, confirmPassword: undefined }));
                }}
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent text-black ${errors.confirmPassword
                    ? "border-red-400 focus:ring-red-300"
                    : "border-gray-300 focus:ring-teal-600"
                  }`}
              />
              <p
                className={`text-red-500 text-right text-xs mt-1 min-h-4 ${errors.confirmPassword ? "visible" : "invisible"
                  }`}
              >
                {errors.confirmPassword ?? " "}
              </p>
            </div>

            {/* Create Account Button */}
            <Button
              type="button"
              onClick={handleCreateAccount}
              fullWidth
              className="mt-6"
              disabled={submitting}
            >
              {submitting ? "Creating account..." : "Create account"}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
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
            <span>Sign up with Google</span>
          </Button>

          {/* Sign in link */}
          <div className="text-center mt-6">
            <span className="text-gray-600 text-sm">
              Already have an account?{" "}
              <Button
                type="button"
                variant="text"
                onClick={() => router.push("/authpage/signin")}
              >
                Sign in
              </Button>
            </span>
          </div>

          {/* Terms and Privacy */}
          <div className="text-center mt-4 text-xs text-gray-500">
            By continuing you agree to NOOI&apos;s
            <a href="#" className="text-teal-600 hover:text-teal-700">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="text-teal-600 hover:text-teal-700">
              Privacy Policy
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
