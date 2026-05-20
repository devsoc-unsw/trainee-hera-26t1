"use client";

import { useEffect, useMemo, useState } from "react";
import type { TripMapParticipant } from "@/app/api/trips/map-locations/route";
import {
  groupDisplayName,
  isDrivingGroupFull,
} from "@/components/trip-dashboard/driving-group-types";
import {
  invalidateDrivingGroupsCache,
  useDrivingGroupsCache,
} from "@/hooks/use-driving-groups-cache";
import { readApiError } from "@/lib/api-error";

const selectClassName =
  "w-full rounded-xl border border-atlas-teal/20 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-atlas-teal/25 focus:ring-2";

type MemberGroupAssignProps = {
  member: TripMapParticipant;
  tripId: string;
  onUpdated?: () => void;
};

export function MemberGroupAssign({
  member,
  tripId,
  onUpdated,
}: MemberGroupAssignProps) {
  const { layout, loading, refresh } = useDrivingGroupsCache(tripId);
  const groups = layout?.groups ?? [];
  const [targetGroupId, setTargetGroupId] = useState("");
  const [swapWith, setSwapWith] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTargetGroupId(member.group_id ?? "");
    setSwapWith("");
    setError(null);
  }, [member.username, member.group_id]);

  const targetGroup = useMemo(
    () => groups.find((g) => g.id === targetGroupId) ?? null,
    [groups, targetGroupId],
  );

  const needsSwap = useMemo(() => {
    if (!targetGroup || targetGroupId === (member.group_id ?? "")) {
      return false;
    }
    if (member.is_driver) return false;
    return isDrivingGroupFull(targetGroup, member.username);
  }, [targetGroup, targetGroupId, member.group_id, member.username, member.is_driver]);

  const swapOptions = useMemo(() => {
    if (!targetGroup || !needsSwap) return [];
    return targetGroup.passengers.filter((p) => p.username !== member.username);
  }, [targetGroup, needsSwap, member.username]);

  const canSave =
    targetGroupId !== (member.group_id ?? "") &&
    (!needsSwap || swapWith.length > 0);

  const onSave = async () => {
    if (member.is_driver) {
      setError("Drivers cannot be moved between groups");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/driving-groups/move-member", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          trip_id: tripId,
          username: member.username,
          to_group_id: targetGroupId || null,
          ...(needsSwap && swapWith ? { swap_with_username: swapWith } : {}),
        }),
      });

      if (!res.ok) {
        setError(await readApiError(res, "Could not update group"));
        return;
      }

      invalidateDrivingGroupsCache(tripId);
      await refresh();
      onUpdated?.();
    } catch {
      setError("Could not update group");
    } finally {
      setSaving(false);
    }
  };

  if (member.is_driver) {
    return (
      <p className="text-xs text-slate-500">
        Drivers stay with their group. Move passengers instead.
      </p>
    );
  }

  if (loading) {
    return <p className="text-xs text-slate-500">Loading groups…</p>;
  }

  if (groups.length === 0) {
    return (
      <p className="text-xs text-slate-500">
        Form driving groups first to assign members.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-atlas-teal">Driving group</span>
        <select
          value={targetGroupId}
          onChange={(e) => {
            setTargetGroupId(e.target.value);
            setSwapWith("");
            setError(null);
          }}
          disabled={saving}
          className={selectClassName}
        >
          <option value="">Unassigned</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {groupDisplayName(g)}
              {isDrivingGroupFull(g, member.username) &&
              g.id !== member.group_id
                ? " (full)"
                : ""}
            </option>
          ))}
        </select>
      </label>

      {needsSwap && (
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-amber-800">
            Swap with (group is full)
          </span>
          <select
            value={swapWith}
            onChange={(e) => setSwapWith(e.target.value)}
            disabled={saving}
            className={selectClassName}
          >
            <option value="">Select passenger to swap…</option>
            {swapOptions.map((p) => (
              <option key={p.username} value={p.username}>
                {p.username}
              </option>
            ))}
          </select>
        </label>
      )}

      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={saving || !canSave}
        onClick={() => void onSave()}
        className="rounded-xl bg-atlas-teal px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-atlas-teal-hover disabled:opacity-70"
      >
        {saving ? "Saving…" : "Save group"}
      </button>
    </div>
  );
}
