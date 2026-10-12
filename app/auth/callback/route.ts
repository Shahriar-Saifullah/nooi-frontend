import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const status = searchParams.get("status");

  if (error) {
    return NextResponse.redirect(
      `${origin}/authpage/signin?error=${encodeURIComponent(error)}`
    );
  }

  if (status === "success") {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(`${origin}/authpage/signin`);
    }

    // Route based on role stored in user_metadata
    const role = user.user_metadata?.role;
    if (role === "vendor") {
      return NextResponse.redirect(`${origin}/sell/dashboard`);
    }
    if (role === "admin") {
      return NextResponse.redirect(`${origin}/admin`);
    }

    // Regular user — check onboarding completion in user_profiles
    // (still accessible as "profiles" via the view alias)
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .single();

    const done = !!profile?.onboarding_completed;
    return NextResponse.redirect(`${origin}${done ? "/dashboard" : "/onboarding"}`);
  }

  if (code) {
    const supabase = await createClient();
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError && data.session) {
      // Password recovery session — redirect to reset page
      if (data.user?.recovery_sent_at) {
        return NextResponse.redirect(
          `${origin}/authpage/reset-password?access_token=${data.session.access_token}&refresh_token=${data.session.refresh_token}`
        );
      }

      // Route based on role
      const role = data.user?.user_metadata?.role;
      if (role === "vendor") {
        return NextResponse.redirect(`${origin}/sell/dashboard`);
      }
      if (role === "admin") {
        return NextResponse.redirect(`${origin}/admin`);
      }

      // Regular user — check onboarding
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", data.user.id)
        .single();

      const done = !!profile?.onboarding_completed;
      return NextResponse.redirect(`${origin}${done ? "/dashboard" : "/onboarding"}`);
    }

    console.error("Auth callback code exchange error:", exchangeError);
    return NextResponse.redirect(
      `${origin}/authpage/signin?error=auth_callback_failed`
    );
  }

  return NextResponse.redirect(`${origin}/authpage/signin`);
}