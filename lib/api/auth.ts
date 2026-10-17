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
  role?: "user" | "vendor" | "admin" | "super_admin";
  vendor_status?: "draft" | "pending" | "approved" | "rejected" | "suspended" | "action_needed";
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
    role: user.user_metadata?.role || "user",
    avatar_url: user.user_metadata?.avatar_url || null,
    plan: user.user_metadata?.plan || "free",
    onboarding_completed: !!user.user_metadata?.onboarding_completed,
    language: user.user_metadata?.language || "en",
  };
}

/**
 * Sign in with email and password.
 * Authenticates with Supabase, then queries profiles.role and vendor_profiles.status.
 */
export async function signIn(
  payload: SignInPayload,
): Promise<ApiResponse<AuthUserResponse>> {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: payload.email,
    password: payload.password,
  });

  if (error) {
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

  // 1. Check backend session endpoint if available
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
    // Backend unavailable or CORS blocked — fall back to database query
  }

  // 2. Query profiles table for true authoritative role
  let userRole: "user" | "vendor" | "admin" | "super_admin" =
    data.user.user_metadata?.role || "user";
  let fullName = data.user.user_metadata?.full_name || "";

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profile?.role) {
      userRole = profile.role as any;
    }
    if (profile?.full_name) {
      fullName = profile.full_name;
    }
  } catch (err) {
    console.warn("[Auth API] profiles table query warning:", err);
  }

  // 3. If user is a vendor, check vendor_profiles.status
  let vendorStatus: AuthUser["vendor_status"] = undefined;
  if (userRole === "vendor") {
    try {
      const { data: vp } = await supabase
        .from("vendor_profiles")
        .select("status, submitted_at")
        .eq("id", data.user.id)
        .maybeSingle();

      if (vp) {
        vendorStatus = vp.status || (vp.submitted_at ? "pending" : "draft");
      } else {
        vendorStatus = "draft";
      }
    } catch (vpErr) {
      console.warn("[Auth API] vendor_profiles table query warning:", vpErr);
      vendorStatus = "pending";
    }
  }

  return {
    success: true,
    data: {
      user: {
        id: data.user.id,
        email: data.user.email || payload.email,
        full_name: fullName,
        role: userRole,
        vendor_status: vendorStatus,
        avatar_url: data.user.user_metadata?.avatar_url || null,
        onboarding_completed: !!data.user.user_metadata?.onboarding_completed,
      },
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
  const supabase = getSupabase();
  const {
    data: { user: sbUser },
    error: sbError,
  } = await supabase.auth.getUser();

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
    if (backendRes.success && backendRes.data?.user) {
      return backendRes;
    }
  } catch {
    // Backend unavailable — fall back to Supabase data
  }

  // Fallback: return Supabase user data enriched with profiles & vendor_profiles
  let userRole: "user" | "vendor" | "admin" | "super_admin" =
    sbUser.user_metadata?.role || "user";
  let fullName =
    sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || "";

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", sbUser.id)
      .maybeSingle();

    if (profile?.role) {
      userRole = profile.role as any;
    }
    if (profile?.full_name) {
      fullName = profile.full_name;
    }
  } catch (err) {
    console.warn("[Auth API] profiles table query warning:", err);
  }

  // If role is not yet vendor or admin, check vendor_profiles
  if (userRole !== "vendor" && userRole !== "admin" && userRole !== "super_admin") {
    try {
      const { data: vp } = await supabase
        .from("vendor_profiles")
        .select("id, status")
        .eq("id", sbUser.id)
        .maybeSingle();

      if (vp) {
        userRole = "vendor";
      }
    } catch {
      // ignore
    }
  }

  let vendorStatus: AuthUser["vendor_status"] = undefined;
  if (userRole === "vendor") {
    try {
      const { data: vp } = await supabase
        .from("vendor_profiles")
        .select("status, submitted_at")
        .eq("id", sbUser.id)
        .maybeSingle();

      if (vp) {
        vendorStatus = vp.status || (vp.submitted_at ? "pending" : "draft");
      } else {
        vendorStatus = "draft";
      }
    } catch (vpErr) {
      console.warn("[Auth API] vendor_profiles table query warning:", vpErr);
    }
  }

  const baseUser = mapSupabaseUser(sbUser);
  return {
    success: true,
    data: {
      user: {
        ...baseUser,
        role: userRole,
        full_name: fullName || baseUser.full_name,
        vendor_status: vendorStatus,
      },
    },
  };
}

export async function forgotPassword(
  payload: { email: string },
): Promise<ApiResponse<{ message: string }>> {
  return requestApi<{ message: string }, { email: string }>({
    baseUrl: getAuthBaseUrl(),
    path: "/forgot-password",
    method: "POST",
    body: payload,
  });
}

export async function resendVerification(
  payload: { email: string },
): Promise<ApiResponse<{ message: string }>> {
  const { error } = await getSupabase().auth.resend({
    type: "signup",
    email: payload.email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback-client`,
    },
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

export type UpdateProfilePayload = {
  fullName?: string;
  avatarUrl?: string | null;
  username?: string;
  bio?: string;
  phone?: string;
  location?: string;
};

export async function updateProfile(
  payload: UpdateProfilePayload,
): Promise<ApiResponse<AuthUserResponse>> {
  const supabase = getSupabase();

  // 1. Update user metadata in Supabase Auth
  const { data: { user }, error: authError } = await supabase.auth.updateUser({
    data: {
      full_name: payload.fullName,
      avatar_url: payload.avatarUrl,
      username: payload.username,
      bio: payload.bio,
      phone: payload.phone,
      location: payload.location,
    },
  });

  if (authError || !user) {
    return {
      success: false,
      error: authError?.message || "Failed to update profile in Auth",
    };
  }

  // 2. Try to update profiles table in database (optional fallback)
  try {
    await supabase
      .from("profiles")
      .update({
        full_name: payload.fullName,
        avatar_url: payload.avatarUrl,
        username: payload.username,
        bio: payload.bio,
        phone: payload.phone,
        location: payload.location,
      })
      .eq("id", user.id);
  } catch (dbError) {
    console.warn("Could not sync profile to Database table 'profiles':", dbError);
  }

  return {
    success: true,
    data: {
      user: mapSupabaseUser(user),
    },
  };
}

export async function updatePassword(password: string): Promise<ApiResponse<unknown>> {
  const supabase = getSupabase();
  const { error } = await supabase.auth.updateUser({
    password,
  });

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