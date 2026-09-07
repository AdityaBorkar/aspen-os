import type { AuditTrailFilters } from "#/schemas";
import type { ObligationFrequency } from "#/utils/constants";
import {
  DEFAULT_REMINDER_DAYS_DUE,
  DEFAULT_REMINDER_DAYS_EXPIRY,
  HEALTH_SCORE_WEIGHTS,
} from "#/utils/constants";

import type { JsonValue } from "@aspen-os/platform/server";
import { function_, is, number, object, safeParse, string } from "valibot";

export { DEFAULT_REMINDER_DAYS_DUE, DEFAULT_REMINDER_DAYS_EXPIRY };

export const MONTHS_PER_FREQUENCY = {
  annual: 12,
  biennial: 24,
  monthly: 1,
  quarterly: 3,
  semi_annual: 6,
  triennial: 36,
} satisfies Record<Exclude<ObligationFrequency, "custom">, number>;

export function monthsPerFrequency(frequency: ObligationFrequency): number | null {
  if (frequency === "custom") {
    return null;
  }
  return MONTHS_PER_FREQUENCY[frequency];
}

export interface WorkflowKvStore {
  clear?: (pattern?: string) => Promise<void>;
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

export function getKvStore(config: Record<string, JsonValue>): WorkflowKvStore | undefined {
  const candidate = config.kvStore;
  if (is(kvStoreSchema, candidate)) {
    // SAFETY: kvStoreSchema verifies get/set/del are functions; the optional clear is only called after a runtime check.
    return candidate as WorkflowKvStore;
  }
  return undefined;
}

export function isWorkflowKvStore(value: WorkflowKvStoreCandidate): value is WorkflowKvStore {
  return is(kvStoreSchema, value);
}

export function getCacheTtl(config: Record<string, JsonValue>, fallback = 300): number {
  const parsed = safeParse(number(), config.cacheTtl);
  if (parsed.success && Number.isFinite(parsed.output) && parsed.output > 0) {
    return parsed.output;
  }
  return fallback;
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
  const metadata = row.metadata ?? null;
  const noteCandidate = metadata?.note;
  const notes = noteCandidate !== undefined && is(string(), noteCandidate) ? noteCandidate : null;
  return {
    action: row.action,
    changes: toChangeRecord(row.changes),
    entityId: row.entityId,
    entityType: row.entityType,
    id: row.id,
    metadata,
    newState: row.newState,
    notes,
    performedAt: row.performedAt,
    performedBy: row.actorId,
    previousState: row.previousState,
  };
}

function toChangeRecord(value: Record<string, JsonValue> | null) {
  if (!value) {
    return null;
  }
  const result: Record<string, { new: JsonValue; old: JsonValue }> = {};
  for (const [key, change] of Object.entries(value)) {
    result[key] =
      change instanceof Object && "new" in change && "old" in change
        ? { new: change.new, old: change.old }
        : { new: change, old: null };
  }
  return result;
}

export interface AuditTrailFilter {
  action?: string;
  actorId?: string;
  endTime?: Date;
  entityId?: string;
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

  const score =
    (data.verified * HEALTH_SCORE_WEIGHTS.verified +
      data.expired * HEALTH_SCORE_WEIGHTS.expired +
      data.overdue * HEALTH_SCORE_WEIGHTS.overdue +
      data.rejected * HEALTH_SCORE_WEIGHTS.rejected) /
    data.total;

  const normalized = Math.max(0, Math.min(100, Math.round(score * 100)));
  return normalized;
}
