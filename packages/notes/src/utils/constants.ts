export const NOTES_ACCESS = {
  GLOBAL: "global",
  PERSONAL: "personal",
} as const;

export type NotesAccess = (typeof NOTES_ACCESS)[keyof typeof NOTES_ACCESS];

export const AUDIT_ENTITY_TYPE = {
  NOTE: "notes:note",
} as const;

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPE)[keyof typeof AUDIT_ENTITY_TYPE];

export const AUDIT_ACTION = {
  CREATED: "created",
  DELETED: "deleted",
  UPDATED: "updated",
} as const;

export type AuditAction = (typeof AUDIT_ACTION)[keyof typeof AUDIT_ACTION];
