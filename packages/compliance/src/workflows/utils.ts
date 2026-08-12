import type { AuditTrailFilters } from "../types";

export const MONTHS_PER_FREQUENCY: Record<string, number> = {
  annual: 12,
  biennial: 24,
  monthly: 1,
  quarterly: 3,
  semi_annual: 6,
  triennial: 36,
};

export const DEFAULT_REMINDER_DAYS = [90, 60, 30, 7];

interface AuditLogRow {
  action: string;
  actorId: string | null;
  changes: Record<string, unknown> | null;
  entityId: string;
  entityType: string;
  id: string;
  metadata: Record<string, unknown> | null;
  newState: Record<string, unknown> | null;
  performedAt: Date;
  previousState: Record<string, unknown> | null;
}

export type { AuditLogRow };

export interface ComplianceAuditEntry {
  action: string;
  changes: Record<string, { new: unknown; old: unknown }> | null;
  entityId: string;
  entityType: string;
  id: string;
  metadata: Record<string, unknown> | null;
  newState: Record<string, unknown> | null;
  notes: string | null;
  performedAt: Date;
  performedBy: string | null;
  previousState: Record<string, unknown> | null;
}

export function normalize(row: AuditLogRow): ComplianceAuditEntry {
  return {
    action: row.action,
    changes: (row.changes ?? null) as Record<
      string,
      { new: unknown; old: unknown }
    > | null,
    entityId: row.entityId,
    entityType: row.entityType,
    id: row.id,
    metadata: row.metadata,
    newState: row.newState,
    notes: null,
    performedAt: row.performedAt,
    performedBy: row.actorId,
    previousState: row.previousState,
  };
}

export function toFilter(filters: AuditTrailFilters | undefined): {
  action?: string;
  actorId?: string;
  endTime?: Date;
  entityType?: string;
  startTime?: Date;
} {
  const filter: {
    action?: string;
    actorId?: string;
    endTime?: Date;
    entityType?: string;
    startTime?: Date;
  } = {};

  if (filters?.action) filter.action = filters.action;
  if (filters?.entityType) filter.entityType = filters.entityType;
  if (filters?.performedBy) filter.actorId = filters.performedBy;
  if (filters?.dateFrom) filter.startTime = filters.dateFrom;
  if (filters?.dateTo) filter.endTime = filters.dateTo;
  return filter;
}

export function computeHealthScore(data: {
  expired: number;
  overdue: number;
  rejected: number;
  total: number;
  verified: number;
}): number {
  if (data.total === 0) return 100;

  const verifiedWeight = 1;
  const expiredWeight = -2;
  const overdueWeight = -2;
  const rejectedWeight = -1;

  const score =
    (data.verified * verifiedWeight +
      data.expired * expiredWeight +
      data.overdue * overdueWeight +
      data.rejected * rejectedWeight) /
    data.total;

  const normalized = Math.max(0, Math.min(100, Math.round(score * 100)));
  return normalized;
}
