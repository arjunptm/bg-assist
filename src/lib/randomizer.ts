import type { AssignmentOption, BannedCombination } from "../shared/models";
import { secureRandomBigInt, secureShuffle } from "./crypto";

export type AssignmentMap = Record<string, string>;

export class RandomizerError extends Error {
  constructor(
    public readonly code:
      | "TOO_MANY_PLAYERS"
      | "INSUFFICIENT_OPTIONS"
      | "NO_VALID_ASSIGNMENT"
      | "NO_ALTERNATIVE_ASSIGNMENT",
    message: string
  ) {
    super(message);
  }
}

interface Slot {
  optionId: string;
  copy: number;
}

interface ShuffleRequest {
  playerIds: string[];
  options: AssignmentOption[];
  enabledOptionIds: Set<string>;
  fixedAssignments: Record<string, AssignmentMap>;
  bannedCombinations: BannedCombination[];
  playerExclusions?: Readonly<Record<string, ReadonlySet<string>>>;
  avoidAssignment?: AssignmentMap;
}

export function assignSet(request: ShuffleRequest): AssignmentMap {
  const { playerIds } = request;
  if (playerIds.length > 12) {
    throw new RandomizerError("TOO_MANY_PLAYERS", "Choose up to 12 players.");
  }
  const slots: Slot[] = request.options
    .filter((option) => request.enabledOptionIds.has(option.id))
    .flatMap((option) =>
      Array.from({ length: option.quantity }, (_, copy) => ({ optionId: option.id, copy }))
    );
  if (slots.length < playerIds.length) {
    throw new RandomizerError(
      "INSUFFICIENT_OPTIONS",
      "Not enough available options for all selected players."
    );
  }

  const bans = new Set<string>();
  for (const rule of request.bannedCombinations) {
    bans.add(`${rule.optionAId}|${rule.optionBId}`);
    bans.add(`${rule.optionBId}|${rule.optionAId}`);
  }
  const fixedByPlayer = playerIds.map((playerId) =>
    Object.values(request.fixedAssignments)
      .map((set) => set[playerId])
      .filter((value): value is string => Boolean(value))
  );
  const compatible = (playerIndex: number, optionId: string) => {
    const playerId = playerIds[playerIndex]!;
    return (
      !request.playerExclusions?.[playerId]?.has(optionId) &&
      fixedByPlayer[playerIndex]!.every((fixed) => !bans.has(`${optionId}|${fixed}`))
    );
  };
  const requireDifferentAssignment =
    request.avoidAssignment !== undefined &&
    playerIds.every((playerId) => request.avoidAssignment?.[playerId] !== undefined);

  // Sort copies cryptographically before DP. Equal option copies remain distinct,
  // which makes every physical quantity slot equally likely.
  const orderedSlots = secureShuffle(slots);
  const playerCount = playerIds.length;
  const fullMask = (1 << playerCount) - 1;
  const memo = new Map<string, bigint>();

  const count = (slotIndex: number, mask: number, differs: boolean): bigint => {
    if (mask === fullMask) return !requireDifferentAssignment || differs ? 1n : 0n;
    if (slotIndex === orderedSlots.length) return 0n;
    if (orderedSlots.length - slotIndex < playerCount - popcount(mask)) return 0n;
    const key = `${slotIndex}:${mask}:${differs ? 1 : 0}`;
    const cached = memo.get(key);
    if (cached !== undefined) return cached;

    let total = count(slotIndex + 1, mask, differs);
    for (let player = 0; player < playerCount; player += 1) {
      if (!(mask & (1 << player)) && compatible(player, orderedSlots[slotIndex]!.optionId)) {
        const playerId = playerIds[player]!;
        const nextDiffers =
          differs || request.avoidAssignment?.[playerId] !== orderedSlots[slotIndex]!.optionId;
        total += count(slotIndex + 1, mask | (1 << player), nextDiffers);
      }
    }
    memo.set(key, total);
    return total;
  };

  const total = count(0, 0, false);
  if (total === 0n) {
    if (requireDifferentAssignment && count(0, 0, true) > 0n) {
      throw new RandomizerError(
        "NO_ALTERNATIVE_ASSIGNMENT",
        "No different assignment is available while the other sets stay fixed. Start over to change the full setup."
      );
    }
    throw new RandomizerError(
      "NO_VALID_ASSIGNMENT",
      "No valid assignment exists with the current players and available options."
    );
  }

  const result: AssignmentMap = {};
  let slotIndex = 0;
  let mask = 0;
  let differs = false;
  while (mask !== fullMask) {
    const branches: Array<{ player: number | null; weight: bigint }> = [];
    const skipWeight = count(slotIndex + 1, mask, differs);
    if (skipWeight > 0n) branches.push({ player: null, weight: skipWeight });
    for (let player = 0; player < playerCount; player += 1) {
      if (!(mask & (1 << player)) && compatible(player, orderedSlots[slotIndex]!.optionId)) {
        const playerId = playerIds[player]!;
        const nextDiffers =
          differs || request.avoidAssignment?.[playerId] !== orderedSlots[slotIndex]!.optionId;
        const weight = count(slotIndex + 1, mask | (1 << player), nextDiffers);
        if (weight > 0n) branches.push({ player, weight });
      }
    }
    const branchTotal = branches.reduce((sum, branch) => sum + branch.weight, 0n);
    let draw = secureRandomBigInt(branchTotal);
    const chosen = branches.find((branch) => {
      if (draw < branch.weight) return true;
      draw -= branch.weight;
      return false;
    })!;
    if (chosen.player !== null) {
      const playerId = playerIds[chosen.player]!;
      result[playerId] = orderedSlots[slotIndex]!.optionId;
      differs = differs || request.avoidAssignment?.[playerId] !== orderedSlots[slotIndex]!.optionId;
      mask |= 1 << chosen.player;
    }
    slotIndex += 1;
  }
  return result;
}

function popcount(value: number): number {
  let count = 0;
  for (let current = value; current; current &= current - 1) count += 1;
  return count;
}

