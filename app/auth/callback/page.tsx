"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/api/auth";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    getCurrentUser().then((res) => {
      if (res.success) {
        const done = !!res.data.user.onboarding_completed;
        router.replace(done ? "/dashboard" : "/onboarding");
      } else {
        router.replace("/authpage/signin?error=google_auth_failed");
      }
    });
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-white">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 text-sm">Signing you in...</p>
      </div>
    </div>
  );
}
