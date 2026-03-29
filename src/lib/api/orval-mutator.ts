import { apiRequest } from "@/lib/api/client";

export async function customFetch<T>(
  url: string,
  options: RequestInit & {
    method: string;
    params?: Record<string, string | number | boolean | Array<string | number | boolean> | undefined>;
    data?: unknown;
  },
): Promise<T> {
  const target = new URL(url, "http://signal-rest-ui.local");
  if (options.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }

      if (Array.isArray(value)) {
        value.forEach((entry) => target.searchParams.append(key, String(entry)));
        return;
      }

      target.searchParams.set(key, String(value));
    });
  }

  return apiRequest<T>(`${target.pathname}${target.search}`, {
    method: options.method,
    body: (options.body ?? options.data) as
      | Record<string, unknown>
      | unknown[]
      | BodyInit
      | null
      | undefined,
    signal: options.signal ?? undefined,
    headers: options.headers,
  });
}
