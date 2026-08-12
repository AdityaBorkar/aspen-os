import { Workflow } from "@aspen-os/platform/server";
import { integer, number, object, optional, pipe, string } from "valibot";

import { AUDIT_ENTITY_TYPE } from "../utils/constants";

const ActivityInputSchema = object({
  entityId: string(),
  entityType: optional(string(), "document"),
  limit: optional(pipe(number(), integer()), 100),
  offset: optional(pipe(number(), integer()), 0),
});

type AuditRow = {
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
};

function mapEntityType(type: string): string {
  switch (type) {
    case "class":
      return AUDIT_ENTITY_TYPE.CLASS;
    case "contact":
      return AUDIT_ENTITY_TYPE.CONTACT;
    case "document":
      return AUDIT_ENTITY_TYPE.DOCUMENT;
    case "share":
      return AUDIT_ENTITY_TYPE.SHARE;
    case "view":
      return AUDIT_ENTITY_TYPE.VIEW;
    default:
      return type;
  }
}

function normalize(row: AuditRow) {
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

export const getActivity = Workflow.name("dms.activity.get")
  .input(ActivityInputSchema)
  .handler(async ({ entityId, entityType, limit, offset }, ctx) => {
    const rows = (await ctx.audit.query({
      entityId,
      entityType: mapEntityType(entityType),
      limit,
      offset,
    })) as unknown as AuditRow[];

    return rows.map(normalize);
  });

export const getDocumentActivity = Workflow.name("dms.activity.document")
  .input(
    object({
      documentId: string(),
      limit: optional(pipe(number(), integer()), 100),
      offset: optional(pipe(number(), integer()), 0),
    }),
  )
  .handler(async ({ documentId, limit, offset }, ctx) => {
    const rows = (await ctx.audit.query({
      entityId: documentId,
      entityType: AUDIT_ENTITY_TYPE.DOCUMENT,
      limit,
      offset,
    })) as unknown as AuditRow[];

    return rows.map(normalize);
  });

export const getClassActivity = Workflow.name("dms.activity.class")
  .input(
    object({
      classId: string(),
      limit: optional(pipe(number(), integer()), 100),
      offset: optional(pipe(number(), integer()), 0),
    }),
  )
  .handler(async ({ classId, limit, offset }, ctx) => {
    const rows = (await ctx.audit.query({
      entityId: classId,
      entityType: AUDIT_ENTITY_TYPE.CLASS,
      limit,
      offset,
    })) as unknown as AuditRow[];

    return rows.map(normalize);
  });
