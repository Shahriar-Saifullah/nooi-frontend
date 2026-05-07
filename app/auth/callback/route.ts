import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const status = searchParams.get("status");
  const type = searchParams.get("type");

  if (error) {
    return NextResponse.redirect(
      `${origin}/authpage/signin?error=${encodeURIComponent(error)}`
    );
  }

  if (status === "success") {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const done = !!user?.user_metadata?.onboarding_completed;
    return NextResponse.redirect(`${origin}${done ? "/dashboard" : "/onboarding"}`);
  }

  if (code) {
    const supabase = await createClient();
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError && data.session) {
      // Check if this is a password recovery session
      if (data.user?.recovery_sent_at) {
        return NextResponse.redirect(
          `${origin}/authpage/reset-password?access_token=${data.session.access_token}&refresh_token=${data.session.refresh_token}`
        );
      }

      const done = !!data.user?.user_metadata?.onboarding_completed;
      return NextResponse.redirect(`${origin}${done ? "/dashboard" : "/onboarding"}`);
    }

    console.error("Auth callback code exchange error:", exchangeError);
    return NextResponse.redirect(
      `${origin}/authpage/signin?error=auth_callback_failed`
    );
  }

  return NextResponse.redirect(`${origin}/authpage/signin`);
}