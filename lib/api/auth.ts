import { createClient } from "@/utils/supabase/client";
import { requestApi, type ApiResponse } from "./http";

export type SignInPayload = {
  email: string;
  password: string;
};

export type SignUpPayload = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword?: string;
};

export type AuthUser = {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  plan?: string;
  onboarding_completed?: boolean;
  language?: string;
};

export type AuthUserResponse = {
  user: AuthUser;
};

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) _supabase = createClient();
  return _supabase;
}

function normalizeBaseUrl(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function getAuthBaseUrl(): string {
  const direct = process.env.NEXT_PUBLIC_AUTH_API_URL;
  if (direct) return normalizeBaseUrl(direct);
  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  if (!apiBase) return "";
  return `${normalizeBaseUrl(apiBase)}/auth`;
}

export function getApiBaseUrl(): string {
  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  if (!apiBase) return "";
  return normalizeBaseUrl(apiBase);
}

function mapSupabaseUser(user: any): AuthUser {
  return {
    id: user.id,
    email: user.email || "",
    full_name: user.user_metadata?.full_name || user.user_metadata?.name || "",
    avatar_url: user.user_metadata?.avatar_url || null,
    plan: user.user_metadata?.plan || "free",
    onboarding_completed: !!user.user_metadata?.onboarding_completed,
    language: user.user_metadata?.language || "en",
  };
}

/**
 * Sign in with email and password.
 * Uses Supabase client directly, then tries to enrich with backend profile data.
 */
export async function signIn(
  payload: SignInPayload,
): Promise<ApiResponse<AuthUserResponse>> {
  const { data, error } = await getSupabase().auth.signInWithPassword({
    email: payload.email,
    password: payload.password,
  });

  if (error) {
    // Handle specific Supabase error messages
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return {
        success: false,
        error: {
          message: "Please verify your email before signing in.",
          code: "EMAIL_NOT_VERIFIED",
        },
      };
    }
    return {
      success: false,
      error: error.message,
    };
  }

  if (!data.user) {
    return {
      success: false,
      error: "User not found",
    };
  }

  // Try to get enriched profile from backend, fall back to Supabase data
  try {
    const backendRes = await requestApi<AuthUserResponse>({
      baseUrl: getAuthBaseUrl(),
      path: "/me",
      method: "GET",
    });
    if (backendRes.success) {
      return backendRes;
    }
  } catch {
    // Backend unavailable or CORS blocked — fall back to Supabase data
  }

  // Fallback: return user data from Supabase session
  return {
    success: true,
    data: {
      user: mapSupabaseUser(data.user),
    },
  };
}

export async function signUp(
  payload: SignUpPayload,
): Promise<ApiResponse<AuthUserResponse>> {
  const { data, error } = await getSupabase().auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: {
        full_name: payload.fullName,
      },
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  if (!data.user) {
    return {
      success: false,
      error: "Signup failed",
    };
  }

  return {
    success: true,
    data: {
      user: mapSupabaseUser(data.user),
    },
  };
}

export async function signInWithGoogle() {
  const { data, error } = await getSupabase().auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) throw error;
  return data;
}

// Keep for backward compatibility
export function getGoogleAuthUrl(): string {
  return "#";
}

export async function logout(): Promise<ApiResponse<unknown>> {
  const { error } = await getSupabase().auth.signOut();
  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }
  return {
    success: true,
    data: {},
  };
}

/**
 * Gets the current user.
 * Checks Supabase session first, then tries to enrich from backend.
 * Falls back to Supabase-only data if backend is unreachable.
 */
export async function getCurrentUser(): Promise<ApiResponse<AuthUserResponse>> {
  const {
    data: { user: sbUser },
    error: sbError,
  } = await getSupabase().auth.getUser();

  if (sbError || !sbUser) {
    return {
      success: false,
      error: sbError?.message || "Not authenticated",
    };
  }

  // Try to get enriched profile from backend
  try {
    const backendRes = await requestApi<AuthUserResponse>({
      baseUrl: getAuthBaseUrl(),
      path: "/me",
      method: "GET",
    });
    if (backendRes.success) {
      return backendRes;
    }
  } catch {
    // Backend unavailable — fall back to Supabase data
  }

  // Fallback: return Supabase user data
  return {
    success: true,
    data: {
      user: mapSupabaseUser(sbUser),
    },
  };
}

export async function forgotPassword(
  payload: { email: string },
): Promise<ApiResponse<{ message: string }>> {
  const { error } = await getSupabase().auth.resetPasswordForEmail(payload.email, {
    redirectTo: `${window.location.origin}/authpage/reset-password`,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: { message: "Password reset email sent" },
  };
}

export async function resendVerification(
  payload: { email: string },
): Promise<ApiResponse<{ message: string }>> {
  const { error } = await getSupabase().auth.resend({
    type: "signup",
    email: payload.email,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: { message: "Verification email resent" },
  };
}

export type OnboardingPayload = {
  user_type: string;
  project_types: string[];
  interested_topics: string[];
};

export async function saveOnboarding(
  payload: OnboardingPayload,
): Promise<ApiResponse<{ message: string }>> {
  // Save to Railway backend
  return requestApi<{ message: string }, OnboardingPayload>({
    baseUrl: getApiBaseUrl(),
    path: "/onboarding",
    method: "POST",
    body: payload,
  });
}