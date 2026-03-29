import type { ConnectionProfile } from "@/lib/types";

interface TargetsListResponse {
  profiles: ConnectionProfile[];
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return (await response.json()) as T;
  }

  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  throw new Error(payload?.error || `Request failed with status ${response.status}`);
}

export async function listConnectionTargets() {
  const response = await fetch("/ui-api/targets");
  return parseApiResponse<TargetsListResponse>(response);
}

export async function createConnectionTarget(profile: ConnectionProfile) {
  const response = await fetch("/ui-api/targets", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(profile),
  });

  return parseApiResponse<ConnectionProfile>(response);
}

export async function updateConnectionTarget(profileId: string, profile: ConnectionProfile) {
  const response = await fetch(`/ui-api/targets/${encodeURIComponent(profileId)}`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(profile),
  });

  return parseApiResponse<ConnectionProfile>(response);
}

export async function deleteConnectionTarget(profileId: string) {
  const response = await fetch(`/ui-api/targets/${encodeURIComponent(profileId)}`, {
    method: "DELETE",
  });

  return parseApiResponse<{ ok: true }>(response);
}
