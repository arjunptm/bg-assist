import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGroup } from "../src/hooks/useGroup";
import { fetchGroup } from "../src/lib/api";
import {
  cacheSnapshot,
  findKnownGroupByCapability,
  getCachedSnapshot,
  rememberGroup
} from "../src/lib/storage";
import type { GroupSnapshot } from "../src/shared/models";

vi.mock("../src/lib/api", () => ({ fetchGroup: vi.fn() }));
vi.mock("../src/lib/storage", () => ({
  cacheSnapshot: vi.fn(),
  findKnownGroupByCapability: vi.fn(),
  getCachedSnapshot: vi.fn(),
  rememberGroup: vi.fn()
}));

const cached: GroupSnapshot = {
  id: "cached-group",
  name: "Cached Group",
  revision: 2,
  games: [],
  fetchedAt: "2026-07-28T00:00:00.000Z"
};

beforeEach(() => vi.clearAllMocks());

describe("group loading", () => {
  it("falls back to a read-only cached snapshot when the network load fails", async () => {
    vi.mocked(fetchGroup).mockRejectedValueOnce(new Error("Network unavailable"));
    vi.mocked(findKnownGroupByCapability).mockResolvedValueOnce({
      capability: "a".repeat(43),
      groupId: cached.id,
      name: cached.name,
      lastOpenedAt: cached.fetchedAt
    });
    vi.mocked(getCachedSnapshot).mockResolvedValueOnce(cached);

    const { result } = renderHook(() => useGroup("a".repeat(43)));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.group).toEqual(cached);
    expect(result.current.stale).toBe(true);
    expect(result.current.error).toBe("");
    expect(cacheSnapshot).not.toHaveBeenCalled();
    expect(rememberGroup).not.toHaveBeenCalled();
  });

  it("refreshes the cache and remembered group after an online load", async () => {
    vi.mocked(fetchGroup).mockResolvedValueOnce(cached);

    const { result } = renderHook(() => useGroup("d".repeat(43)));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.group).toEqual(cached);
    expect(result.current.stale).toBe(false);
    expect(cacheSnapshot).toHaveBeenCalledWith(cached);
    expect(rememberGroup).toHaveBeenCalledWith(expect.objectContaining({
      capability: "d".repeat(43),
      groupId: cached.id,
      name: cached.name
    }));
  });
});
