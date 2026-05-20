import type { DrivingGroup } from "@/components/trip-dashboard/driving-group-types";
import type { GroupParticipant } from "@/lib/driving-group-move";

function isGroupFullInDraft(
  group: DrivingGroup,
  excludeUsername?: string,
): boolean {
  const seats = group.driver?.seats ?? 0;
  const count = group.passengers.filter(
    (p) => p.username !== excludeUsername,
  ).length;
  return count >= seats;
}

export type DraftLayout = {
  groups: DrivingGroup[];
  unassigned: string[];
};

export type PendingMove = {
  username: string;
  to_group_id: string | null;
  swap_with_username?: string;
};

export function cloneDraft(layout: DraftLayout): DraftLayout {
  return {
    groups: layout.groups.map((g) => ({
      ...g,
      passengers: g.passengers.map((p) => ({ ...p })),
      driver: g.driver ? { ...g.driver } : null,
    })),
    unassigned: [...layout.unassigned],
  };
}

function removePassenger(draft: DraftLayout, username: string) {
  for (const group of draft.groups) {
    group.passengers = group.passengers.filter((p) => p.username !== username);
  }
  draft.unassigned = draft.unassigned.filter((u) => u !== username);
}

function addPassengerToGroup(
  draft: DraftLayout,
  groupId: string,
  username: string,
) {
  const group = draft.groups.find((g) => g.id === groupId);
  if (!group) return;
  const order = group.passengers.length + 1;
  group.passengers.push({ username, order });
}

/** Apply a move/swap to draft layout only (visual staging). */
export function applyMoveToDraft(
  draft: DraftLayout,
  move: PendingMove,
): { ok: true } | { ok: false; error: string; needsSwap?: boolean } {
  const username = move.username;
  const toGroupId = move.to_group_id;

  const fromGroup = draft.groups.find((g) =>
    g.passengers.some((p) => p.username === username),
  );
  const fromGroupId = fromGroup?.id ?? null;
  const wasUnassigned = draft.unassigned.includes(username);

  if (fromGroupId === toGroupId) {
    return { ok: true };
  }

  if (toGroupId === null) {
    removePassenger(draft, username);
    if (!draft.unassigned.includes(username)) {
      draft.unassigned.push(username);
    }
    return { ok: true };
  }

  const target = draft.groups.find((g) => g.id === toGroupId);
  if (!target) {
    return { ok: false, error: "Group not found" };
  }

  if (target.passengers.some((p) => p.username === username)) {
    return { ok: true };
  }

  if (isGroupFullInDraft(target, username) && !move.swap_with_username) {
    return { ok: false, error: "Group is full", needsSwap: true };
  }

  const swapUsername = move.swap_with_username?.trim();
  if (isGroupFullInDraft(target, username) && swapUsername) {
    const swapper = target.passengers.find((p) => p.username === swapUsername);
    if (!swapper) {
      return { ok: false, error: "Swap target not in group" };
    }
    removePassenger(draft, username);
    removePassenger(draft, swapUsername);
    addPassengerToGroup(draft, toGroupId, username);
    if (fromGroupId) {
      addPassengerToGroup(draft, fromGroupId, swapUsername);
    } else if (wasUnassigned) {
      if (!draft.unassigned.includes(swapUsername)) {
        draft.unassigned.push(swapUsername);
      }
    }
    return { ok: true };
  }

  removePassenger(draft, username);
  addPassengerToGroup(draft, toGroupId, username);
  return { ok: true };
}

/** Rebuild staged layout from saved baseline + ordered pending moves. */
export function rebuildDraftFromPending(
  saved: DraftLayout,
  pendingMoves: PendingMove[],
): DraftLayout {
  const draft = cloneDraft(saved);
  for (const move of pendingMoves) {
    const result = applyMoveToDraft(draft, move);
    if (!result.ok) {
      throw new Error(result.error);
    }
  }
  return draft;
}

export function layoutToParticipants(layout: DraftLayout): GroupParticipant[] {
  const participants: GroupParticipant[] = [];

  for (const group of layout.groups) {
    if (group.driver) {
      participants.push({
        username: group.driver.username,
        group_id: group.id,
        group_order: 0,
        is_driver: true,
        seats: group.driver.seats,
      });
    }

    for (const passenger of group.passengers) {
      participants.push({
        username: passenger.username,
        group_id: group.id,
        group_order: passenger.order,
        is_driver: false,
        seats: null,
      });
    }
  }

  for (const username of layout.unassigned) {
    participants.push({
      username,
      group_id: null,
      group_order: null,
      is_driver: false,
      seats: null,
    });
  }

  return participants;
}

export function assignmentUpdatesFromLayouts(
  saved: DraftLayout,
  draft: DraftLayout,
) {
  const before = layoutToParticipants(saved);
  const after = layoutToParticipants(draft);

  return after.filter((next) => {
    const prev = before.find((p) => p.username === next.username);
    return (
      prev?.group_id !== next.group_id || prev?.group_order !== next.group_order
    );
  });
}

export function validateDraftLayout(
  layout: DraftLayout,
): { ok: true } | { ok: false; error: string } {
  for (const group of layout.groups) {
    const seats = group.driver?.seats ?? 0;
    if (group.passengers.length > seats) {
      return {
        ok: false,
        error: `${group.name ?? "Group"} has too many passengers`,
      };
    }
  }
  return { ok: true };
}

export function draftsEqual(a: DraftLayout, b: DraftLayout): boolean {
  if (a.unassigned.length !== b.unassigned.length) return false;
  const sortedA = [...a.unassigned].sort();
  const sortedB = [...b.unassigned].sort();
  if (sortedA.some((u, i) => u !== sortedB[i])) return false;

  for (const groupA of a.groups) {
    const groupB = b.groups.find((g) => g.id === groupA.id);
    if (!groupB) return false;
    const passengersA = groupA.passengers.map((p) => p.username).sort();
    const passengersB = groupB.passengers.map((p) => p.username).sort();
    if (passengersA.length !== passengersB.length) return false;
    if (passengersA.some((u, i) => u !== passengersB[i])) return false;
  }
  return true;
}
