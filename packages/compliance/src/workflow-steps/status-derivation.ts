import type { VerificationStatus } from "#/utils/constants";
import { VERIFICATION_STATUS } from "#/utils/constants";
import { MS_PER_DAY } from "#/utils/dates";

function parseDateOnly(dateStr: string | null): number | null {
  if (!dateStr) {
    return null;
  }
  const time = new Date(dateStr).getTime();
  return Number.isFinite(time) ? time : null;
}

export function daysUntil(dateStr: string | null): number | null {
  const target = parseDateOnly(dateStr);
  if (target === null) {
    return null;
  }
  return Math.ceil((target - Date.now()) / MS_PER_DAY);
}

export function daysSince(dateStr: string | null): number | null {
  const target = parseDateOnly(dateStr);
  if (target === null) {
    return null;
  }
  return Math.ceil((Date.now() - target) / MS_PER_DAY);
}

export function isTerminal(status: VerificationStatus): boolean {
  return status === VERIFICATION_STATUS.ARCHIVED || status === VERIFICATION_STATUS.RENEWED;
}

export function isAutoTransitionable(status: VerificationStatus): boolean {
  return status !== VERIFICATION_STATUS.DRAFT && !isTerminal(status);
}

export function deriveExpiryStatus(
  currentStatus: VerificationStatus,
  expiryDate: string | null,
): VerificationStatus | null {
  if (!isAutoTransitionable(currentStatus)) {
    return null;
  }
  if (!expiryDate) {
    return null;
  }

  const days = daysUntil(expiryDate);
  if (days === null) {
    return null;
  }

  if (days <= 0) {
    if (
      currentStatus === VERIFICATION_STATUS.VERIFIED ||
      currentStatus === VERIFICATION_STATUS.SUBMITTED ||
      currentStatus === VERIFICATION_STATUS.UNDER_REVIEW ||
      currentStatus === VERIFICATION_STATUS.OVERDUE
    ) {
      return VERIFICATION_STATUS.EXPIRED;
    }
  }

  return null;
}

export function deriveOverdueStatus(
  currentStatus: VerificationStatus,
  dueDate: string | null,
  completedAt: Date | null,
): VerificationStatus | null {
  if (!isAutoTransitionable(currentStatus)) {
    return null;
  }
  if (currentStatus === VERIFICATION_STATUS.EXPIRED) {
    return null;
  }
  if (!dueDate) {
    return null;
  }
  if (completedAt) {
    return null;
  }

  const days = daysUntil(dueDate);
  if (days === null) {
    return null;
  }

  if (days <= 0) {
    return VERIFICATION_STATUS.OVERDUE;
  }

  return null;
}

export function shouldNotify(
  reminderDays: number[],
  lastNotifiedAt: Date | null,
  daysUntilTarget: number,
): boolean {
  const sorted = reminderDays.toSorted((left, right) => right - left);
  for (const threshold of sorted) {
    if (daysUntilTarget <= threshold) {
      if (!lastNotifiedAt) {
        return true;
      }
      const lastNotifiedDays = Math.ceil((Date.now() - lastNotifiedAt.getTime()) / MS_PER_DAY);
      const nextThreshold = sorted.find((candidate) => candidate < threshold);
      if (nextThreshold === undefined) {
        return lastNotifiedDays > 0;
      }
      if (daysUntilTarget <= nextThreshold) {
        continue;
      }
      return true;
    }
  }
  return false;
}

export function shouldEscalate(
  escalationDays: number[] | null,
  lastEscalatedAt: Date | null,
  daysSinceTarget: number,
): number | null {
  if (!escalationDays || escalationDays.length === 0) {
    return null;
  }

  const sorted = escalationDays.toSorted((left, right) => left - right);
  for (let index = 0; index < sorted.length; index++) {
    const threshold = sorted[index];
    if (threshold === undefined) {
      continue;
    }
    if (daysSinceTarget >= threshold) {
      if (!lastEscalatedAt) {
        return index + 1;
      }
      const lastEscalatedDays = Math.ceil((Date.now() - lastEscalatedAt.getTime()) / MS_PER_DAY);
      const nextThreshold = sorted[index + 1];
      if (nextThreshold !== undefined && daysSinceTarget >= nextThreshold) {
        continue;
      }
      if (lastEscalatedDays > 0) {
        return index + 1;
      }
    }
  }
  return null;
}

export function isSnoozed(snoozedUntil: Date | null): boolean {
  if (!snoozedUntil) {
    return false;
  }
  return snoozedUntil.getTime() > Date.now();
}
