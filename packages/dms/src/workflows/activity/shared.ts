import type { JsonValue } from "@aspen-os/platform/server";
import { instance, object, safeParse, string } from "valibot";

export interface AuditRow {
  action: string;
  actor_id: string | null;
  changes: Record<string, JsonValue> | null;
  entity_id: string;
  entity_type: string;
  id: string;
  metadata: Record<string, JsonValue> | null;
  new_state: Record<string, JsonValue> | null;
  performed_at: Date;
  previous_state: Record<string, JsonValue> | null;
  seq?: number;
  [key: string]: JsonValue;
}

const AuditRowSchema = object({
  action: string(),
  entity_id: string(),
  entity_type: string(),
  id: string(),
  performed_at: instance(Date),
});

export function isAuditRow(value: JsonValue): value is AuditRow {
  return safeParse(AuditRowSchema, value).success;
}

export function mapEntityType(type: string): string {
  return type;
}

export function normalize(row: AuditRow) {
  return {
    action: row.action,
    actorId: row.actor_id,
    changes: row.changes,
    entityId: row.entity_id,
    entityType: mapEntityType(row.entity_type),
    id: row.id,
    metadata: row.metadata,
    newState: row.new_state,
    performedAt: row.performed_at,
    previousState: row.previous_state,
    seq: row.seq,
  };
}
