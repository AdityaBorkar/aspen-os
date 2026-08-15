import { AUDIT_ENTITY_TYPE } from "#/utils/constants";

export interface AuditRow {
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
  seq?: number;
}

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
    actorId: row.actorId,
    changes: row.changes,
    entityId: row.entityId,
    entityType: row.entityType,
    id: row.id,
    metadata: row.metadata,
    newState: row.newState,
    performedAt: row.performedAt,
    previousState: row.previousState,
    seq: row.seq,
  };
}
