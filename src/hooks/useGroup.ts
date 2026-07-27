import { useCallback, useEffect, useState } from "react";
import { fetchGroup } from "../lib/api";
import {
  cacheSnapshot,
  findKnownGroupByCapability,
  getCachedSnapshot,
  rememberGroup
} from "../lib/storage";
import type { GroupSnapshot } from "../shared/models";

export function useGroup(capability: string) {
  const [group, setGroup] = useState<GroupSnapshot>();
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const fresh = await fetchGroup(capability);
      setGroup(fresh);
      setStale(false);
      await Promise.all([
        cacheSnapshot(fresh),
        rememberGroup({
          capability,
          groupId: fresh.id,
          name: fresh.name,
          lastOpenedAt: new Date().toISOString()
        })
      ]);
    } catch (caught) {
      const known = await findKnownGroupByCapability(capability);
      const cached = known ? await getCachedSnapshot(known.groupId) : undefined;
      if (cached) {
        setGroup(cached);
        setStale(true);
      } else {
        setError(caught instanceof Error ? caught.message : "Could not open this group.");
      }
    } finally {
      setLoading(false);
    }
  }, [capability]);

  useEffect(() => void load(), [load]);

  const update = useCallback(
    async (snapshot: GroupSnapshot) => {
      setGroup(snapshot);
      setStale(false);
      await cacheSnapshot(snapshot);
    },
    []
  );

  return { group, loading, stale, error, reload: load, update };
}

