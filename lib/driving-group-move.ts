export type GroupParticipant = {
  username: string;
  group_id: string | null;
  group_order: number | null;
  is_driver: boolean;
  seats: number | null;
};

export type MoveMemberInput = {
  username: string;
  to_group_id: string | null;
  swap_with_username?: string;
};

export type ParticipantAssignment = {
  username: string;
  group_id: string | null;
  group_order: number | null;
};

export function passengersInGroup(
  participants: GroupParticipant[],
  groupId: string,
  excludeUsername?: string,
): GroupParticipant[] {
  return participants.filter(
    (p) =>
      p.group_id === groupId &&
      !p.is_driver &&
      p.username !== excludeUsername,
  );
}

export function driverInGroup(
  participants: GroupParticipant[],
  groupId: string,
): GroupParticipant | undefined {
  return participants.find((p) => p.group_id === groupId && p.is_driver);
}

export function isGroupFull(
  participants: GroupParticipant[],
  groupId: string,
  excludeUsername?: string,
): boolean {
  const driver = driverInGroup(participants, groupId);
  const capacity = driver?.seats ?? 0;
  const count = passengersInGroup(participants, groupId, excludeUsername).length;
  return count >= capacity;
}

/** Rebuild order indices: driver = 0, passengers = 1..n */
export function ordersForGroup(
  participants: GroupParticipant[],
  groupId: string,
): Map<string, number> {
  const inGroup = participants
    .filter((p) => p.group_id === groupId)
    .sort((a, b) => (a.group_order ?? 999) - (b.group_order ?? 999));

  const driver = inGroup.find((p) => p.is_driver);
  const passengers = inGroup.filter((p) => !p.is_driver);
  const orders = new Map<string, number>();

  if (driver) {
    orders.set(driver.username, 0);
  }
  passengers.forEach((p, index) => {
    orders.set(p.username, index + 1);
  });

  return orders;
}

function normalizeGroupOrders(working: GroupParticipant[], groupId: string) {
  const orders = ordersForGroup(working, groupId);
  for (const [username, order] of orders) {
    const row = working.find((p) => p.username === username);
    if (row) row.group_order = order;
  }
}

/**
 * Apply a passenger move/swap in memory. Returns updated assignments or an error.
 */
export function planMemberMove(
  participants: GroupParticipant[],
  input: MoveMemberInput,
):
  | { ok: true; assignments: ParticipantAssignment[] }
  | { ok: false; error: string; code?: string } {
  const mover = participants.find((p) => p.username === input.username);
  if (!mover) {
    return { ok: false, error: "Participant not found" };
  }
  if (mover.is_driver) {
    return { ok: false, error: "Drivers cannot be moved between groups" };
  }

  const fromGroupId = mover.group_id;
  const toGroupId = input.to_group_id;

  if (fromGroupId === toGroupId) {
    return {
      ok: true,
      assignments: participants.map((p) => ({
        username: p.username,
        group_id: p.group_id,
        group_order: p.group_order,
      })),
    };
  }

  const working = participants.map((p) => ({ ...p }));

  const setParticipant = (
    username: string,
    group_id: string | null,
    group_order: number | null,
  ) => {
    const row = working.find((p) => p.username === username);
    if (row) {
      row.group_id = group_id;
      row.group_order = group_order;
    }
  };

  if (toGroupId === null) {
    setParticipant(mover.username, null, null);
  } else {
    const targetDriver = driverInGroup(working, toGroupId);
    if (!targetDriver) {
      return { ok: false, error: "Target group has no driver" };
    }

    const excludingMover =
      mover.group_id === toGroupId ? mover.username : undefined;
    const targetPassengers = passengersInGroup(
      working,
      toGroupId,
      excludingMover,
    );
    const capacity = targetDriver.seats ?? 0;

    if (targetPassengers.length >= capacity) {
      const swapUsername = input.swap_with_username?.trim();
      if (!swapUsername) {
        return {
          ok: false,
          error: "Group is full — choose a passenger to swap with",
          code: "group_full",
        };
      }

      const swapper = working.find((p) => p.username === swapUsername);
      if (!swapper || swapper.is_driver) {
        return {
          ok: false,
          error: "Swap target must be a passenger in that group",
        };
      }
      if (swapper.group_id !== toGroupId) {
        return {
          ok: false,
          error: "Swap target is not in the selected group",
        };
      }

      const moverOrder = mover.group_order;
      const swapperOrder = swapper.group_order;

      setParticipant(mover.username, toGroupId, swapperOrder);
      setParticipant(swapper.username, fromGroupId, moverOrder);
    } else {
      setParticipant(mover.username, toGroupId, targetPassengers.length + 1);
    }
  }

  const affected = new Set<string>();
  if (fromGroupId) affected.add(fromGroupId);
  if (toGroupId) affected.add(toGroupId);
  for (const groupId of affected) {
    normalizeGroupOrders(working, groupId);
  }

  return {
    ok: true,
    assignments: working.map((p) => ({
      username: p.username,
      group_id: p.group_id,
      group_order: p.group_order,
    })),
  };
}
