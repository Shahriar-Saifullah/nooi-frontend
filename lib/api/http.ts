export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiSuccess<TData> = {
  success: true;
  data: TData;
  message?: string;
};

export type ApiFailure = {
  success: false;
  error: unknown;
};

export type ApiResponse<TData> = ApiSuccess<TData> | ApiFailure;

type RequestJsonOptions<TBody> = {
  baseUrl?: string;
  path: string;
  method?: HttpMethod;
  body?: TBody;
  headers?: Record<string, string>;
  timeoutMs?: number;
  signal?: AbortSignal;
  credentials?: RequestCredentials;
};

function parseTimeoutMs(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.floor(n);
}

function buildUrl(baseUrl: string, path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  if (!baseUrl) return path;

  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  return new URL(normalizedPath, normalizedBase).toString();
}

function pickErrorMessage(data: unknown, fallback: string): string {
  if (typeof data === "string" && data.trim()) return data;
  if (data && typeof data === "object") {
    const maybeMessage = (data as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim())
      return maybeMessage;
    const maybeError = (data as { error?: unknown }).error;
    if (typeof maybeError === "string" && maybeError.trim()) return maybeError;
  }
  return fallback;
}

export async function requestJson<TResponse, TBody = unknown>(
  options: RequestJsonOptions<TBody>,
): Promise<TResponse> {
  const envTimeoutMs = parseTimeoutMs(process.env.NEXT_PUBLIC_API_TIMEOUT);
  const timeoutMs = options.timeoutMs ?? envTimeoutMs;

  const controller = new AbortController();
  const timeoutId = timeoutMs
    ? setTimeout(() => controller.abort(), timeoutMs)
    : undefined;

  const url = buildUrl(
    options.baseUrl ?? process.env.NEXT_PUBLIC_API_URL ?? "",
    options.path,
  );

  try {
    const res = await fetch(url, {
      method: options.method ?? "GET",
      headers: {
        ...(options.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
        ...(options.headers ?? {}),
      },
      body:
        options.body !== undefined ? JSON.stringify(options.body) : undefined,
      credentials: options.credentials ?? "include",
      signal: options.signal ?? controller.signal,
    });

    const contentType = res.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");

    const data: unknown = isJson
      ? await res.json().catch(() => null)
      : await res.text().catch(() => "");

    if (!res.ok) {
      const message = pickErrorMessage(
        data,
        res.statusText || "Request failed",
      );
      throw new ApiError(message, res.status, data);
    }

    return data as TResponse;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("Request timed out", 0, null);
    }
    throw new ApiError("Network error", 0, err);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function isApiResponse(value: unknown): value is ApiResponse<unknown> {
  return (
    !!value &&
    typeof value === "object" &&
    "success" in value &&
    typeof (value as { success?: unknown }).success === "boolean"
  );
}

export async function requestApi<TData, TBody = unknown>(
  options: RequestJsonOptions<TBody>,
): Promise<ApiResponse<TData>> {
  const envTimeoutMs = parseTimeoutMs(process.env.NEXT_PUBLIC_API_TIMEOUT);
  const timeoutMs = options.timeoutMs ?? envTimeoutMs;

  const controller = new AbortController();
  const timeoutId = timeoutMs
    ? setTimeout(() => controller.abort(), timeoutMs)
    : undefined;

  const url = buildUrl(
    options.baseUrl ?? process.env.NEXT_PUBLIC_API_URL ?? "",
    options.path,
  );

  try {
    const res = await fetch(url, {
      method: options.method ?? "GET",
      headers: {
        ...(options.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
        ...(options.headers ?? {}),
      },
      body:
        options.body !== undefined ? JSON.stringify(options.body) : undefined,
      credentials: options.credentials ?? "include",
      signal: options.signal ?? controller.signal,
    });

    const contentType = res.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");

    const data: unknown = isJson
      ? await res.json().catch(() => null)
      : await res.text().catch(() => "");

    if (isApiResponse(data)) return data as ApiResponse<TData>;

    if (res.ok) {
      return {
        success: true,
        data: data as TData,
      };
    }

    return {
      success: false,
      error: pickErrorMessage(data, res.statusText || "Request failed"),
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { success: false, error: "Request timed out" };
    }
    const details = err instanceof Error ? err.message : "";
    const suffix = details ? ` (${details})` : "";
    return {
      success: false,
      error: `Network error: cannot reach ${url}. Check NEXT_PUBLIC_API_URL / NEXT_PUBLIC_AUTH_API_URL and that your backend is running.${suffix}`,
    };
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
