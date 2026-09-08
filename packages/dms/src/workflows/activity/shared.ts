import { AUDIT_ENTITY_TYPE } from "#/utils/constants";

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

/**
 * Back-compat entity-type map: old audit rows use snake/camel variants
 * ("file_view", "fileView", "public_link", "publicLink"). Canonical types are
 * the AUDIT_ENTITY_TYPE ("dms:*") values; normalize() enforces canonical form
 * on read while this map keeps old rows readable.
 */
export function mapEntityType(type: string): string {
  switch (type) {
    case "class": {
      return AUDIT_ENTITY_TYPE.CLASS;
    }
    case "contact": {
      return AUDIT_ENTITY_TYPE.CONTACT;
    }
    case "file": {
      return AUDIT_ENTITY_TYPE.FILE;
    }
    case "file_view":
    case "fileView": {
      return AUDIT_ENTITY_TYPE.FILE_VIEW;
    }
    case "folder": {
      return AUDIT_ENTITY_TYPE.FOLDER;
    }
    case "label": {
      return AUDIT_ENTITY_TYPE.LABEL;
    }
    case "public_link":
    case "publicLink": {
      return AUDIT_ENTITY_TYPE.PUBLIC_LINK;
    }
    case "setting": {
      return AUDIT_ENTITY_TYPE.SETTING;
    }
    case "share": {
      return AUDIT_ENTITY_TYPE.SHARE;
    }
    default: {
      return type;
    }
  }
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
