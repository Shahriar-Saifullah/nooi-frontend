"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Suspense } from "react";

function CallbackClientInner() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (accessToken && refreshToken) {
        fetch(`${process.env.NEXT_PUBLIC_AUTH_API_URL}/set-session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            access_token: accessToken,
            refresh_token: refreshToken,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              const done = !!data.user?.onboarding_completed;
              router.replace(done ? "/dashboard" : "/onboarding");
            } else {
              router.replace("/authpage/signin?error=google_auth_failed");
            }
          })
          .catch(() => {
            router.replace("/authpage/signin?error=server_error");
          });
        return;
      }
    }

    // No hash — fallback to signin
    router.replace("/authpage/signin");
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

export default function CallbackClientPage() {
  return (
    <Suspense fallback={null}>
      <CallbackClientInner />
    </Suspense>
  );
}