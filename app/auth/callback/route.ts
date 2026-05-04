import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * Server-side Route Handler for the auth callback.
 *
 * When Supabase redirects back with a `code` query parameter,
 * this handler exchanges it for a session on the server side.
 * This avoids the PKCE "code verifier not found in storage" error
 * that happens when exchangeCodeForSession is called client-side
 * (e.g. after clicking an email verification link in a different
 * browser tab or device).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const status = searchParams.get("status");

  // Handle error redirects
  if (error) {
    return NextResponse.redirect(
      `${origin}/authpage/signin?error=${encodeURIComponent(error)}`
    );
  }

  // Handle status=success (from backend OAuth callback)
  if (status === "success") {
    return NextResponse.redirect(`${origin}/dashboard`);
  }

  // Exchange the auth code for a session on the server
  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      // Get user to check onboarding status
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const onboardingCompleted =
        !!user?.user_metadata?.onboarding_completed;

      return NextResponse.redirect(
        `${origin}${onboardingCompleted ? "/dashboard" : "/onboarding"}`
      );
    }

    // If code exchange failed, redirect with error
    console.error("Auth callback code exchange error:", exchangeError);
    return NextResponse.redirect(
      `${origin}/authpage/signin?error=auth_callback_failed`
    );
  }

  // No code and no error — redirect to signin
  return NextResponse.redirect(`${origin}/authpage/signin`);
}
