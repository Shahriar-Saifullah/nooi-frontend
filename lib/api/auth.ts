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

function normalizeBaseUrl(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function getAuthBaseUrl(): string {
  //   return "https://nooi-backend-staging.up.railway.app/auth";
  const direct = process.env.NEXT_PUBLIC_AUTH_API_URL;
  if (direct) return normalizeBaseUrl(direct);
  console.log(direct);
  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  if (!apiBase) return "";
  return `${normalizeBaseUrl(apiBase)}/auth`;
}

export function getGoogleAuthUrl(): string {
  const base = getAuthBaseUrl();
  return base ? `${base}/google` : "/auth/google";
}

export async function signIn(
  payload: SignInPayload,
): Promise<ApiResponse<AuthUserResponse>> {
  return requestApi<AuthUserResponse, SignInPayload>({
    baseUrl: getAuthBaseUrl(),
    path: "/login",
    method: "POST",
    body: payload,
  });
}

export async function signUp(
  payload: SignUpPayload,
): Promise<ApiResponse<AuthUserResponse>> {
  return requestApi<
    AuthUserResponse,
    { full_name: string; email: string; password: string }
  >({
    baseUrl: getAuthBaseUrl(),
    path: "/signup",
    method: "POST",
    body: {
      full_name: payload.fullName,
      email: payload.email,
      password: payload.password,
    },
  });
}

export async function logout(): Promise<ApiResponse<unknown>> {
  return requestApi<unknown>({
    baseUrl: getAuthBaseUrl(),
    path: "/logout",
    method: "POST",
  });
}

export async function getCurrentUser(): Promise<ApiResponse<AuthUserResponse>> {
  return requestApi<AuthUserResponse>({
    baseUrl: getAuthBaseUrl(),
    path: "/me",
    method: "GET",
  });
}

export async function forgotPassword(
  payload: { email: string }
): Promise<ApiResponse<{ message: string }>> {
  return requestApi<{ message: string }, { email: string }>({
    baseUrl: getAuthBaseUrl(),
    path: "/forgot-password",
    method: "POST",
    body: payload,
  });
}

export async function resendVerification(
  payload: { email: string }
): Promise<ApiResponse<{ message: string }>> {
  return requestApi<{ message: string }, { email: string }>({
    baseUrl: getAuthBaseUrl(),
    path: "/resend-verification",
    method: "POST",
    body: payload,
  });
}


export type OnboardingPayload = {
  user_type: string;
  project_types: string[];
  interested_topics: string[];
};

export function getApiBaseUrl(): string {
  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  if (!apiBase) return "";
  return apiBase.endsWith("/") ? apiBase.slice(0, -1) : apiBase;
}

export async function saveOnboarding(
  payload: OnboardingPayload
): Promise<ApiResponse<{ message: string }>> {
  return requestApi<{ message: string }, OnboardingPayload>({
    baseUrl: getApiBaseUrl(),
    path: "/onboarding",
    method: "POST",
    body: payload,
  });
}