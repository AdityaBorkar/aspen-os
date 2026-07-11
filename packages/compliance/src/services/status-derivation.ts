import type { VerificationStatus } from "../constants";

export function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - target.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function isTerminal(status: VerificationStatus): boolean {
  return status === "archived" || status === "renewed";
}

export function isAutoTransitionable(status: VerificationStatus): boolean {
  return status !== "draft" && !isTerminal(status);
}

export function deriveExpiryStatus(
  currentStatus: VerificationStatus,
  expiryDate: string | null,
): VerificationStatus | null {
  if (!isAutoTransitionable(currentStatus)) return null;
  if (!expiryDate) return null;

  const days = daysUntil(expiryDate);
  if (days === null) return null;

  if (days <= 0) {
    if (currentStatus === "verified" || currentStatus === "submitted") {
      return "expired";
    }
  }

  return null;
}

export function deriveOverdueStatus(
  currentStatus: VerificationStatus,
  dueDate: string | null,
  completedAt: Date | null,
): VerificationStatus | null {
  if (!isAutoTransitionable(currentStatus)) return null;
  if (!dueDate) return null;
  if (completedAt) return null;

  const days = daysUntil(dueDate);
  if (days === null) return null;

  if (days <= 0) {
    return "overdue";
  }

  return null;
}

export function shouldNotify(
  reminderDays: number[],
  lastNotifiedAt: Date | null,
  daysUntilTarget: number,
): boolean {
  const sorted = [...reminderDays].sort((a, b) => b - a);
  for (const threshold of sorted) {
    if (daysUntilTarget <= threshold) {
      if (!lastNotifiedAt) return true;
      const lastNotifiedDays = Math.ceil(
        (Date.now() - lastNotifiedAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      const nextThreshold = sorted.find((t) => t < threshold);
      if (nextThreshold === undefined) {
        return lastNotifiedDays > 0;
      }
      if (daysUntilTarget <= nextThreshold) continue;
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
  if (!escalationDays || escalationDays.length === 0) return null;

  const sorted = [...escalationDays].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i++) {
    const threshold = sorted[i];
    if (threshold === undefined) continue;
    if (daysSinceTarget >= threshold) {
      if (!lastEscalatedAt) return i + 1;
      const lastEscalatedDays = Math.ceil(
        (Date.now() - lastEscalatedAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      const nextThreshold = sorted[i + 1];
      if (nextThreshold !== undefined && daysSinceTarget >= nextThreshold) {
        continue;
      }
      if (lastEscalatedDays > 0) return i + 1;
    }
  }
  return null;
}

export function isSnoozed(snoozedUntil: Date | null): boolean {
  if (!snoozedUntil) return false;
  return snoozedUntil.getTime() > Date.now();
}
