import type { AuditTrailFilters } from "#/types";
import type { ObligationFrequency } from "#/utils/constants";

import type { JsonValue } from "@aspen-os/platform/server";
import { function_, is, object } from "valibot";

export const MONTHS_PER_FREQUENCY = {
  annual: 12,
  biennial: 24,
  monthly: 1,
  quarterly: 3,
  semi_annual: 6,
  triennial: 36,
} satisfies Partial<Record<ObligationFrequency, number>>;

export const DEFAULT_REMINDER_DAYS = [90, 60, 30, 7];

export interface WorkflowKvStore {
  del: (key: string) => Promise<void>;
  get: (key: string) => Promise<JsonValue | null>;
  set: (key: string, value: JsonValue, ttl?: number) => Promise<void>;
}

const kvStoreSchema = object({
  del: function_(),
  get: function_(),
  set: function_(),
});

type WorkflowKvStoreCandidate = WorkflowKvStore | JsonValue;

export function isWorkflowKvStore(value: WorkflowKvStoreCandidate): value is WorkflowKvStore {
  return is(kvStoreSchema, value);
}

interface AuditLogRow {
  action: string;
  actorId: string | null;
  changes: Record<string, JsonValue> | null;
  entityId: string;
  entityType: string;
  id: string;
  metadata: Record<string, JsonValue> | null;
  newState: Record<string, JsonValue> | null;
  performedAt: Date;
  previousState: Record<string, JsonValue> | null;
}

export type { AuditLogRow };

export interface ComplianceAuditEntry {
  action: string;
  changes: Record<string, { new: JsonValue; old: JsonValue }> | null;
  entityId: string;
  entityType: string;
  id: string;
  metadata: Record<string, JsonValue> | null;
  newState: Record<string, JsonValue> | null;
  notes: string | null;
  performedAt: Date;
  performedBy: string | null;
  previousState: Record<string, JsonValue> | null;
}

export function normalize(row: AuditLogRow): ComplianceAuditEntry {
  return {
    action: row.action,
    changes: toChangeRecord(row.changes),
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

function toChangeRecord(
  value: Record<string, JsonValue> | null,
): Record<string, { new: JsonValue; old: JsonValue }> | null {
  if (!value) {
    return null;
  }
  const result: Record<string, { new: JsonValue; old: JsonValue }> = {};
  for (const [key, change] of Object.entries(value)) {
    if (change instanceof Object && "new" in change && "old" in change) {
      result[key] = { new: change.new, old: change.old };
    }
  }
  return result;
}

export function toRecord(value: Record<string, JsonValue>): Record<string, JsonValue> {
  return Object.fromEntries(Object.entries(value));
}

interface AuditTrailFilter {
  action?: string;
  actorId?: string;
  endTime?: Date;
  entityType?: string;
  startTime?: Date;
}

export function toFilter(filters: AuditTrailFilters | undefined): AuditTrailFilter {
  const filter: AuditTrailFilter = {};

  if (filters?.action) {
    filter.action = filters.action;
  }
  if (filters?.entityType) {
    filter.entityType = filters.entityType;
  }
  if (filters?.performedBy) {
    filter.actorId = filters.performedBy;
  }
  if (filters?.dateFrom) {
    filter.startTime = filters.dateFrom;
  }
  if (filters?.dateTo) {
    filter.endTime = filters.dateTo;
  }
  return filter;
}

export function computeHealthScore(data: {
  expired: number;
  overdue: number;
  rejected: number;
  total: number;
  verified: number;
}): number {
  if (data.total === 0) {
    return 100;
  }

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
