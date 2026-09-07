import type { VerificationStatus } from "#/utils/constants";
import { VERIFICATION_STATUS } from "#/utils/constants";

type Status = VerificationStatus;

export const DOCUMENT_TRANSITIONS = {
  [VERIFICATION_STATUS.DRAFT]: [
    VERIFICATION_STATUS.SUBMITTED,
    VERIFICATION_STATUS.ARCHIVED,
    VERIFICATION_STATUS.VERIFIED,
  ],
  [VERIFICATION_STATUS.SUBMITTED]: [
    VERIFICATION_STATUS.UNDER_REVIEW,
    VERIFICATION_STATUS.EXPIRED,
    VERIFICATION_STATUS.OVERDUE,
    VERIFICATION_STATUS.ARCHIVED,
    VERIFICATION_STATUS.VERIFIED,
  ],
  [VERIFICATION_STATUS.UNDER_REVIEW]: [
    VERIFICATION_STATUS.VERIFIED,
    VERIFICATION_STATUS.REJECTED,
    VERIFICATION_STATUS.EXPIRED,
    VERIFICATION_STATUS.OVERDUE,
    VERIFICATION_STATUS.ARCHIVED,
  ],
  [VERIFICATION_STATUS.VERIFIED]: [
    VERIFICATION_STATUS.EXPIRED,
    VERIFICATION_STATUS.OVERDUE,
    VERIFICATION_STATUS.RENEWED,
    VERIFICATION_STATUS.ARCHIVED,
  ],
  [VERIFICATION_STATUS.REJECTED]: [
    VERIFICATION_STATUS.SUBMITTED,
    VERIFICATION_STATUS.UNDER_REVIEW,
    VERIFICATION_STATUS.ARCHIVED,
  ],
  [VERIFICATION_STATUS.EXPIRED]: [
    VERIFICATION_STATUS.RENEWED,
    VERIFICATION_STATUS.ARCHIVED,
    VERIFICATION_STATUS.VERIFIED,
  ],
  [VERIFICATION_STATUS.OVERDUE]: [
    VERIFICATION_STATUS.EXPIRED,
    VERIFICATION_STATUS.RENEWED,
    VERIFICATION_STATUS.ARCHIVED,
    VERIFICATION_STATUS.VERIFIED,
  ],
  [VERIFICATION_STATUS.RENEWED]: [VERIFICATION_STATUS.ARCHIVED],
  [VERIFICATION_STATUS.ARCHIVED]: [],
} as const satisfies Record<Status, readonly Status[]>;

function allows(from: Status, to: Status): boolean {
  const allowed = DOCUMENT_TRANSITIONS[from];
  // SAFETY: as-const transition tuples hold only VerificationStatus literals; widening to readonly Status[] preserves membership checks.
  return (allowed as readonly Status[]).includes(to);
}

export function isTransitionAllowed(from: Status, to: Status): boolean {
  if (from === to) {
    return false;
  }
  return allows(from, to);
}

export function assertTransitionAllowed(from: Status, to: Status): void {
  if (from === to) {
    throw new Error(`Document is already in status "${from}"`);
  }
  if (!allows(from, to)) {
    throw new Error(`Cannot transition document from "${from}" to "${to}"`);
  }
}
