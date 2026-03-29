import { getApiRuntimeState } from "@/lib/api/runtime";
import type {
  ConnectionProfile,
  SignalApiErrorPayload,
  TransportMode,
} from "@/lib/types";
import { joinUrl, normalizeBaseUrl } from "@/lib/utils";

export class ApiError extends Error {
  status?: number;
  payload?: SignalApiErrorPayload | string;
  targetUrl?: string;

  constructor(message: string, options: { status?: number; payload?: SignalApiErrorPayload | string; targetUrl?: string } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.payload = options.payload;
    this.targetUrl = options.targetUrl;
  }
}

export function getErrorMessage(error: unknown, fallback = "Request failed.") {
  if (error instanceof ApiError) {
    return error.message || fallback;
  }
  if (error instanceof Error) {
    return error.message || fallback;
  }
  if (typeof error === "string") {
    return error;
  }
  return fallback;
}

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: BodyInit | Record<string, unknown> | unknown[] | null;
  profile?: ConnectionProfile;
  transport?: TransportMode;
}

export interface ConnectionTestResult {
  about: Record<string, unknown>;
  profile: ConnectionProfile;
  warning?: string;
}

function buildRequestTarget(profile: ConnectionProfile, path: string) {
  const runtime = getApiRuntimeState().runtimeConfig;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (profile.transport === "proxy") {
    const basePath = runtime?.proxy.basePath ?? "/proxy";
    return {
      url: `${basePath}${normalizedPath}`,
      headers: {
        "x-target-base-url": normalizeBaseUrl(profile.baseUrl),
      },
    };
  }

  return {
    url: joinUrl(profile.baseUrl, normalizedPath),
    headers: {},
  };
}

function encodeBody(body: ApiRequestOptions["body"], headers: Headers) {
  if (body == null) {
    return undefined;
  }

  if (
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof ArrayBuffer ||
    typeof body === "string"
  ) {
    return body;
  }

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return JSON.stringify(body);
}

function isNetworkFailure(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    error.name === "TypeError" ||
    error.name === "NetworkError" ||
    message.includes("failed to fetch") ||
    message.includes("fetch failed") ||
    message.includes("load failed") ||
    message.includes("networkerror")
  );
}

function getNetworkFailureMessage(profile: ConnectionProfile) {
  const runtime = getApiRuntimeState().runtimeConfig;
  const target = normalizeBaseUrl(profile.baseUrl);

  if (profile.transport === "proxy") {
    return `Proxy access to ${target} failed. The target host is unreachable from this machine, or the service is not listening on that address.`;
  }

  if (runtime?.proxy.enabled) {
    return `Direct browser access to ${target} failed. This is usually a LAN routing problem or a browser CORS restriction. The UI can retry through the local proxy.`;
  }

  return `Direct browser access to ${target} failed. This is usually a LAN routing problem or a browser CORS restriction.`;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  if (
    contentType.startsWith("image/") ||
    contentType.startsWith("audio/") ||
    contentType.startsWith("video/") ||
    contentType.includes("application/octet-stream") ||
    contentType.includes("application/pdf")
  ) {
    return (await response.blob()) as T;
  }

  return (await response.text()) as T;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const profile = options.profile ?? getApiRuntimeState().profile;
  if (!profile) {
    throw new ApiError("No active connection profile is selected.");
  }

  const { url, headers: runtimeHeaders } = buildRequestTarget(profile, path);
  const headers = new Headers(options.headers);

  Object.entries(runtimeHeaders).forEach(([key, value]) => headers.set(key, value));
  if (profile.authHeaderName && profile.authToken) {
    headers.set(profile.authHeaderName, profile.authToken);
  }

  const body = encodeBody(options.body, headers);
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      body,
    });
  } catch (error) {
    if (isNetworkFailure(error)) {
      throw new ApiError(getNetworkFailureMessage(profile), {
        payload: error instanceof Error ? error.message : String(error),
        targetUrl: url,
      });
    }
    throw error;
  }

  if (!response.ok) {
    let payload: SignalApiErrorPayload | string;
    try {
      payload = await parseResponse<SignalApiErrorPayload | string>(response.clone());
    } catch {
      payload = response.statusText;
    }
    throw new ApiError(
      typeof payload === "string" ? payload : payload.error || `Request failed with status ${response.status}`,
      {
        status: response.status,
        payload,
        targetUrl: url,
      },
    );
  }

  return parseResponse<T>(response);
}

export async function testConnection(profile: ConnectionProfile): Promise<ConnectionTestResult> {
  try {
    const about = await apiRequest<Record<string, unknown>>("/v1/about", {
      method: "GET",
      profile,
    });
    return {
      about,
      profile,
    };
  } catch (error) {
    const runtime = getApiRuntimeState().runtimeConfig;
    const canRetryWithProxy =
      runtime?.proxy.enabled &&
      profile.transport === "direct" &&
      error instanceof ApiError &&
      error.status === undefined;

    if (!canRetryWithProxy) {
      throw error;
    }

    const proxyProfile: ConnectionProfile = {
      ...profile,
      transport: "proxy",
    };

    try {
      const about = await apiRequest<Record<string, unknown>>("/v1/about", {
        method: "GET",
        profile: proxyProfile,
      });
      return {
        about,
        profile: proxyProfile,
        warning:
          "Direct browser access failed, so the profile was saved with proxy transport.",
      };
    } catch (proxyError) {
      if (proxyError instanceof ApiError && proxyError.status === undefined) {
        throw new ApiError(
          `${error.message} Retried through the local proxy and that failed too. ${proxyError.message}`,
          {
            payload: proxyError.payload,
            targetUrl: proxyError.targetUrl,
          },
        );
      }
      throw proxyError;
    }
  }
}
