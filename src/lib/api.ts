import type { ApiError, GameDraft, GroupSnapshot } from "../shared/models";

export class ApiRequestError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers }
  });
  const body = (await response.json()) as T | ApiError;
  if (!response.ok) {
    const error = body as ApiError;
    throw new ApiRequestError(response.status, error.error.code, error.error.message);
  }
  return body as T;
}

export async function createGroup(name: string): Promise<GroupSnapshot & { capability: string }> {
  return request("/api/groups", { method: "POST", body: JSON.stringify({ name }) });
}

export async function fetchGroup(capability: string): Promise<GroupSnapshot> {
  return request(`/api/groups/${encodeURIComponent(capability)}`);
}

export async function saveGame(capability: string, draft: GameDraft): Promise<GroupSnapshot> {
  const suffix = draft.id ? `/${draft.id}` : "";
  return request(`/api/groups/${encodeURIComponent(capability)}/games${suffix}`, {
    method: draft.id ? "PUT" : "POST",
    body: JSON.stringify(draft)
  });
}

export async function deleteGame(
  capability: string,
  gameId: string,
  revision: number
): Promise<GroupSnapshot> {
  return request(`/api/groups/${encodeURIComponent(capability)}/games/${gameId}`, {
    method: "DELETE",
    body: JSON.stringify({ revision })
  });
}

export async function restoreGame(
  capability: string,
  gameId: string,
  revision: number
): Promise<GroupSnapshot> {
  return request(`/api/groups/${encodeURIComponent(capability)}/games/${gameId}/restore`, {
    method: "POST",
    body: JSON.stringify({ revision })
  });
}

