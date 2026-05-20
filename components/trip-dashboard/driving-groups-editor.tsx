"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeftRight, GripVertical, X } from "lucide-react";
import {
  groupDisplayName,
  passengerCountLabel,
  type DrivingGroup,
} from "@/components/trip-dashboard/driving-group-types";
import {
  applyMoveToDraft,
  assignmentUpdatesFromLayouts,
  cloneDraft,
  rebuildDraftFromPending,
  validateDraftLayout,
  type DraftLayout,
  type PendingMove,
} from "@/lib/driving-group-draft";
import { readApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";

type SwapPrompt = {
  username: string;
  toGroupId: string;
  groupLabel: string;
  /** Layout after prior pending moves, before this swap attempt. */
  layoutBase: DraftLayout;
};

type DrivingGroupsEditorProps = {
  tripId: string;
  isAdmin: boolean;
  layout: DraftLayout | null;
  layoutVersion: number;
  loading: boolean;
  onChanged?: () => void;
  onRefresh: () => Promise<void>;
};

function ParticipantCard({
  username,
  label,
  draggable,
  isDragging,
  isPending,
}: {
  username: string;
  label?: string;
  draggable: boolean;
  isDragging?: boolean;
  isPending?: boolean;
}) {
  return (
    <div
      draggable={draggable}
      className={cn(
        "flex min-h-[2.75rem] items-center gap-2 rounded-xl border bg-white px-3 py-2.5 text-sm shadow-sm transition-opacity",
        draggable && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50",
        isPending
          ? "border-amber-300 bg-amber-50/80"
          : "border-slate-200 hover:border-atlas-teal/30",
      )}
    >
      {draggable && (
        <GripVertical
          className="size-4 shrink-0 text-slate-400"
          aria-hidden
        />
      )}
      <span className="min-w-0 flex-1 font-medium text-slate-800">
        {label ?? username}
      </span>
    </div>
  );
}

export function DrivingGroupsEditor({
  tripId,
  isAdmin,
  layout,
  layoutVersion,
  loading,
  onChanged,
  onRefresh,
}: DrivingGroupsEditorProps) {
  const [saved, setSaved] = useState<DraftLayout>({
    groups: [],
    unassigned: [],
  });
  const [draft, setDraft] = useState<DraftLayout>({ groups: [], unassigned: [] });
  const [pendingMoves, setPendingMoves] = useState<PendingMove[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggingUsername, setDraggingUsername] = useState<string | null>(
    null,
  );
  const [dropTargetGroupId, setDropTargetGroupId] = useState<string | null>(
    null,
  );
  const [swapPrompt, setSwapPrompt] = useState<SwapPrompt | null>(null);
  const [swapWith, setSwapWith] = useState("");

  const hasStagedMoves = pendingMoves.length > 0;

  const pendingUsernames = useMemo(() => {
    const names = new Set<string>();
    for (const move of pendingMoves) {
      names.add(move.username);
      if (move.swap_with_username) {
        names.add(move.swap_with_username);
      }
    }
    return names;
  }, [pendingMoves]);

  useEffect(() => {
    if (!layout) return;
    if (hasStagedMoves) return;
    setSaved(cloneDraft(layout));
    setDraft(cloneDraft(layout));
    setPendingMoves([]);
    setSwapPrompt(null);
    setError(null);
  }, [layout, layoutVersion, hasStagedMoves]);

  const stageMove = (move: PendingMove) => {
    const priorMoves = pendingMoves.filter((m) => m.username !== move.username);
    const layoutBase = rebuildDraftFromPending(saved, priorMoves);
    const trialDraft = cloneDraft(layoutBase);
    const result = applyMoveToDraft(trialDraft, move);

    if (!result.ok) {
      if (result.needsSwap && move.to_group_id) {
        const group = layoutBase.groups.find((g) => g.id === move.to_group_id);
        setSwapPrompt({
          username: move.username,
          toGroupId: move.to_group_id,
          groupLabel: group ? groupDisplayName(group) : "group",
          layoutBase,
        });
        setSwapWith("");
      } else {
        setError(result.error);
      }
      return false;
    }

    const nextPending = [...priorMoves, move];
    const nextDraft = rebuildDraftFromPending(saved, nextPending);
    setPendingMoves(nextPending);
    setDraft(nextDraft);
    setSwapPrompt(null);
    setError(null);
    return true;
  };

  const onDropOnGroup = (group: DrivingGroup) => {
    if (!draggingUsername || !isAdmin) return;
    const username = draggingUsername;
    setDraggingUsername(null);
    setDropTargetGroupId(null);

    if (group.passengers.some((p) => p.username === username)) {
      return;
    }

    stageMove({ username, to_group_id: group.id });
  };

  const queueSwap = () => {
    if (!swapPrompt || !swapWith) return;
    stageMove({
      username: swapPrompt.username,
      to_group_id: swapPrompt.toGroupId,
      swap_with_username: swapWith,
    });
    setSwapWith("");
  };

  const onDiscard = () => {
    setDraft(cloneDraft(saved));
    setPendingMoves([]);
    setSwapPrompt(null);
    setError(null);
  };

  const onSave = async () => {
    if (!hasStagedMoves) return;

    const validation = validateDraftLayout(draft);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    const assignments = assignmentUpdatesFromLayouts(saved, draft);
    if (assignments.length === 0) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/driving-groups/apply-assignments", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          trip_id: tripId,
          assignments,
        }),
      });

      if (!res.ok) {
        setError(await readApiError(res, "Could not save group changes"));
        await onRefresh();
        return;
      }

      setPendingMoves([]);
      setSaved(cloneDraft(draft));
      await onRefresh();
      onChanged?.();
    } catch {
      setError("Could not save group changes");
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  if (loading && !layout) {
    return <p className="text-sm text-slate-500">Loading groups…</p>;
  }

  if (!layout || draft.groups.length === 0) {
    return <p className="text-sm text-slate-500">No groups yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {isAdmin && (
        <p className="text-xs leading-relaxed text-slate-500">
          Drag passengers between groups, then click <strong>Save changes</strong>.
          Full groups need a swap partner before saving.
        </p>
      )}

      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}

      {swapPrompt &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-atlas-teal/30 p-4 backdrop-blur-sm"
            role="presentation"
            onClick={() => {
              setSwapPrompt(null);
              setSwapWith("");
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="swap-modal-title"
              className="relative w-full max-w-sm rounded-2xl border border-atlas-teal/15 bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  setSwapPrompt(null);
                  setSwapWith("");
                }}
                className="absolute right-4 top-4 rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close"
              >
                <X className="size-5" aria-hidden />
              </button>

              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <ArrowLeftRight className="size-6" strokeWidth={2} aria-hidden />
              </div>

              <h2
                id="swap-modal-title"
                className="text-center text-lg font-semibold text-slate-900"
              >
                Swap passengers
              </h2>
              <p className="mt-2 text-center text-sm text-slate-600">
                <span className="font-mono font-medium text-atlas-teal">
                  {swapPrompt.username}
                </span>{" "}
                is moving into{" "}
                <span className="font-medium">{swapPrompt.groupLabel}</span>,
                which is full. Choose who they swap with:
              </p>

              <select
                value={swapWith}
                onChange={(e) => setSwapWith(e.target.value)}
                className="mt-4 w-full rounded-xl border border-atlas-teal/20 bg-white px-4 py-3 text-sm text-slate-800 outline-none ring-atlas-teal/25 focus:ring-2"
              >
                <option value="">Select passenger…</option>
                {swapPrompt.layoutBase.groups
                  .find((g) => g.id === swapPrompt.toGroupId)
                  ?.passengers.map((p) => (
                    <option key={p.username} value={p.username}>
                      {p.username}
                    </option>
                  ))}
              </select>

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  disabled={!swapWith}
                  onClick={queueSwap}
                  className="flex-1 rounded-xl bg-atlas-teal px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-atlas-teal-hover disabled:opacity-60"
                >
                  Stage swap
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSwapPrompt(null);
                    setSwapWith("");
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>

              <p className="mt-3 text-center text-xs text-slate-500">
                Staged swaps apply after you click Save changes.
              </p>
            </div>
          </div>,
          document.body,
        )}

      <div className="space-y-3">
        {draft.groups.map((group) => (
          <div
            key={group.id}
            className={cn(
              "rounded-2xl border bg-slate-50 p-3 transition-colors",
              dropTargetGroupId === group.id && isAdmin
                ? "border-atlas-teal bg-atlas-mist/30"
                : "border-slate-200",
            )}
            style={{ borderLeftWidth: 4, borderLeftColor: group.color }}
            onDragOver={
              isAdmin
                ? (e) => {
                    e.preventDefault();
                    setDropTargetGroupId(group.id);
                  }
                : undefined
            }
            onDragLeave={
              isAdmin
                ? () => {
                    if (dropTargetGroupId === group.id) {
                      setDropTargetGroupId(null);
                    }
                  }
                : undefined
            }
            onDrop={
              isAdmin
                ? (e) => {
                    e.preventDefault();
                    onDropOnGroup(group);
                  }
                : undefined
            }
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <span
                  className="inline-block size-3.5 shrink-0 rounded-full"
                  style={{ backgroundColor: group.color }}
                  aria-hidden
                />
                {groupDisplayName(group)}
              </h3>
              <span className="text-xs text-slate-500">
                {passengerCountLabel(group)}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {group.driver && (
                <div className="rounded-xl border border-atlas-teal/20 bg-atlas-mist/50 px-3 py-2.5 text-sm">
                  <span className="font-medium text-atlas-teal">
                    {group.driver.username}
                  </span>
                  <span className="ml-1.5 text-slate-500">(driver)</span>
                </div>
              )}
              {group.passengers.map((p, index) => (
                <div
                  key={p.username}
                  onDragStart={
                    isAdmin
                      ? () => setDraggingUsername(p.username)
                      : undefined
                  }
                  onDragEnd={() => {
                    setDraggingUsername(null);
                    setDropTargetGroupId(null);
                  }}
                >
                  <ParticipantCard
                    username={p.username}
                    label={`${group.driver ? index + 2 : index + 1}. ${p.username}`}
                    draggable={isAdmin && !saving}
                    isDragging={draggingUsername === p.username}
                    isPending={pendingUsernames.has(p.username)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        {(draft.unassigned.length > 0 || isAdmin) && (
          <div
            className={cn(
              "rounded-2xl border border-dashed border-slate-300 bg-white/70 p-3",
              dropTargetGroupId === "unassigned" &&
                isAdmin &&
                "border-atlas-teal bg-atlas-mist/20",
            )}
            onDragOver={
              isAdmin
                ? (e) => {
                    e.preventDefault();
                    setDropTargetGroupId("unassigned");
                  }
                : undefined
            }
            onDrop={
              isAdmin
                ? (e) => {
                    e.preventDefault();
                    if (draggingUsername) {
                      stageMove({
                        username: draggingUsername,
                        to_group_id: null,
                      });
                      setDraggingUsername(null);
                      setDropTargetGroupId(null);
                    }
                  }
                : undefined
            }
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Unassigned
            </p>
            {draft.unassigned.length === 0 ? (
              <p className="text-xs text-slate-400">Drop here to unassign</p>
            ) : (
              <div className="flex flex-col gap-2">
                {draft.unassigned.map((username) => (
                  <div
                    key={username}
                    onDragStart={
                      isAdmin
                        ? () => setDraggingUsername(username)
                        : undefined
                    }
                    onDragEnd={() => {
                      setDraggingUsername(null);
                      setDropTargetGroupId(null);
                    }}
                  >
                    <ParticipantCard
                      username={username}
                      draggable={isAdmin && !saving}
                      isDragging={draggingUsername === username}
                      isPending={pendingUsernames.has(username)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {isAdmin && hasStagedMoves && (
        <div className="sticky bottom-0 -mx-1 flex flex-col gap-2 rounded-xl border border-atlas-teal/20 bg-white/95 p-3 shadow-md backdrop-blur-sm">
          <p className="text-xs text-slate-600">
            {pendingMoves.length} staged change
            {pendingMoves.length === 1 ? "" : "s"} — save to apply on the trip.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void onSave()}
              className="flex-1 rounded-xl bg-atlas-teal px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-atlas-teal-hover disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={onDiscard}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60"
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
