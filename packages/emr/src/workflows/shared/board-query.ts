import { QUEUE_TOKEN_STATUS, TASK_STATUS } from "#/utils/constants";

export const QUEUE_WAITING_STATUS = QUEUE_TOKEN_STATUS.WAITING;

export const QUEUE_CALLED_STATUS = QUEUE_TOKEN_STATUS.CALLED;

export const QUEUE_BOARD_STATUSES = [QUEUE_WAITING_STATUS, QUEUE_CALLED_STATUS] as const;

export const NURSING_OPEN_STATUS: string = TASK_STATUS.OPEN;

// Rehab sittings persist clinic-capitalized text (schemas/rehab.ts), not the
// lowercase REHAB_SITTING_STATUS pgEnum values. Centralize the literals here so
// the day board and booking guards cannot drift apart again.
export const REHAB_BOARD_STATUSES = {
  BOOKED: "Booked",
  COMPLETED: "Completed",
  IN_PROGRESS: "InProgress",
} as const;

export type RehabBoardStatus = (typeof REHAB_BOARD_STATUSES)[keyof typeof REHAB_BOARD_STATUSES];

export const REHAB_OPEN_STATUSES: readonly string[] = [
  REHAB_BOARD_STATUSES.BOOKED,
  "CheckedIn",
  REHAB_BOARD_STATUSES.IN_PROGRESS,
];

export function diagnosticsPriorityOf(priority: string): number {
  if (priority === "stat") {
    return 0;
  }
  if (priority === "urgent") {
    return 1;
  }
  if (priority === "routine") {
    return 2;
  }
  return 3;
}

export function boardBranchOf(branchId: string | undefined): string {
  return branchId ?? "main";
}

export function boardLimitOf(limit: number | undefined, fallback: number, cap: number): number {
  const wanted = limit ?? fallback;
  return Math.min(Math.max(wanted, 1), cap);
}
