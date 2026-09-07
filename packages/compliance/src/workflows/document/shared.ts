import { complianceDocument } from "#/db-schemas";
import {
  ACTIVE_DOCUMENT_STATUSES,
  EXPIRY_ELIGIBLE_STATUSES,
  OVERDUE_ELIGIBLE_STATUSES,
  VERIFICATION_STATUS,
} from "#/utils/constants";
import { futureDateOnly, toDateOnly, todayDateOnly } from "#/utils/dates";

import type { JsonValue } from "@aspen-os/platform/server";
import { and, gte, inArray, isNotNull, isNull, lte, or } from "drizzle-orm";

export function toDbDate(value: Date | null | undefined): string | null {
  if (!value) {
    return null;
  }
  return toDateOnly(value);
}

export function expiryWindowCondition(days: number, now: Date = new Date()) {
  const todayStr = todayDateOnly(now);
  const futureStr = futureDateOnly(days, now);
  return and(
    isNotNull(complianceDocument.expiryDate),
    lte(complianceDocument.expiryDate, futureStr),
    gte(complianceDocument.expiryDate, todayStr),
    inArray(complianceDocument.verificationStatus, [
      VERIFICATION_STATUS.VERIFIED,
      VERIFICATION_STATUS.SUBMITTED,
    ]),
  );
}

export function dueWindowCondition(days: number, now: Date = new Date()) {
  const todayStr = todayDateOnly(now);
  const futureStr = futureDateOnly(days, now);
  return and(
    isNotNull(complianceDocument.dueDate),
    lte(complianceDocument.dueDate, futureStr),
    gte(complianceDocument.dueDate, todayStr),
    isNull(complianceDocument.completedAt),
  );
}

export function expiredCondition(now: Date = new Date()) {
  return and(
    isNotNull(complianceDocument.expiryDate),
    lte(complianceDocument.expiryDate, todayDateOnly(now)),
    inArray(complianceDocument.verificationStatus, [...EXPIRY_ELIGIBLE_STATUSES]),
  );
}

export function overdueCondition(now: Date = new Date()) {
  return and(
    isNotNull(complianceDocument.dueDate),
    lte(complianceDocument.dueDate, todayDateOnly(now)),
    isNull(complianceDocument.completedAt),
    inArray(complianceDocument.verificationStatus, [...OVERDUE_ELIGIBLE_STATUSES]),
  );
}

export function expiredOrOverdueCondition(now: Date = new Date()) {
  return or(expiredCondition(now), overdueCondition(now));
}

export function activeWithDateCondition() {
  return and(
    inArray(complianceDocument.verificationStatus, [...ACTIVE_DOCUMENT_STATUSES]),
    or(isNotNull(complianceDocument.expiryDate), isNotNull(complianceDocument.dueDate)),
  );
}

export function diffRecords(
  oldRecord: Record<string, JsonValue | undefined>,
  newRecord: Record<string, JsonValue | undefined>,
  keys: readonly string[],
) {
  const changes: Record<string, { new: JsonValue; old: JsonValue }> = {};
  for (const key of keys) {
    if (key === "updatedAt") {
      continue;
    }
    const oldVal = oldRecord[key];
    const newVal = newRecord[key];
    if (!isEqualValue(oldVal, newVal)) {
      changes[key] = {
        new: newVal ?? null,
        old: oldVal ?? null,
      };
    }
  }
  return changes;
}

function isEqualValue(left: JsonValue | undefined, right: JsonValue | undefined): boolean {
  if (Object.is(left, right)) {
    return true;
  }
  return JSON.stringify(left) === JSON.stringify(right);
}

export function requireValidDays(field: string, days: number | undefined): void {
  if (days === undefined) {
    return;
  }
  if (!Number.isFinite(days) || days < 0) {
    throw new Error(`${field} must be a finite number >= 0`);
  }
}
