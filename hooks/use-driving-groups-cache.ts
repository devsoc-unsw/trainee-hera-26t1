"use client";

import { useCallback, useEffect, useState } from "react";
import { cloneDraft, type DraftLayout } from "@/lib/driving-group-draft";
import { readApiError } from "@/lib/api-error";

type CacheEntry = {
  layout: DraftLayout;
};

const cacheByTripId = new Map<string, CacheEntry>();

export function getCachedDrivingGroups(tripId: string): DraftLayout | null {
  const entry = cacheByTripId.get(tripId);
  return entry ? cloneDraft(entry.layout) : null;
}

export function setCachedDrivingGroups(tripId: string, layout: DraftLayout) {
  cacheByTripId.set(tripId, { layout: cloneDraft(layout) });
}

export function invalidateDrivingGroupsCache(tripId?: string) {
  if (tripId) {
    cacheByTripId.delete(tripId);
  } else {
    cacheByTripId.clear();
  }
}

async function fetchDrivingGroupsLayout(
  tripId: string,
): Promise<DraftLayout> {
  const res = await fetch(
    `/api/trips/${encodeURIComponent(tripId)}/driving-groups`,
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Could not load groups");
  }
  const layout: DraftLayout = {
    groups: data.groups || [],
    unassigned: data.unassigned_passengers || [],
  };
  setCachedDrivingGroups(tripId, layout);
  return layout;
}

/** Cached driving groups for a trip. Refetches only when cache is empty or refresh() is called. */
export function useDrivingGroupsCache(tripId: string | undefined) {
  const [layout, setLayout] = useState<DraftLayout | null>(() =>
    tripId ? getCachedDrivingGroups(tripId) : null,
  );
  const [loading, setLoading] = useState(
    () => !!(tripId && !getCachedDrivingGroups(tripId)),
  );
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const load = useCallback(
    async (force: boolean) => {
      if (!tripId) {
        setLayout(null);
        setLoading(false);
        return;
      }

      if (!force) {
        const cached = getCachedDrivingGroups(tripId);
        if (cached) {
          setLayout(cached);
          setLoading(false);
          setError(null);
          return;
        }
      }

      setLoading(true);
      setError(null);

      try {
        const next = await fetchDrivingGroupsLayout(tripId);
        setLayout(next);
        setVersion((v) => v + 1);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not load groups",
        );
      } finally {
        setLoading(false);
      }
    },
    [tripId],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const refresh = useCallback(async () => {
    if (!tripId) return;
    invalidateDrivingGroupsCache(tripId);
    await load(true);
  }, [tripId, load]);

  const updateCache = useCallback(
    (next: DraftLayout) => {
      if (!tripId) return;
      setCachedDrivingGroups(tripId, next);
      setLayout(cloneDraft(next));
      setVersion((v) => v + 1);
    },
    [tripId],
  );

  return { layout, loading, error, version, refresh, updateCache };
}
