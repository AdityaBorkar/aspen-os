import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { dmsDocumentClass } from "../db-schemas";
import { CLASS_EVENTS } from "../pubsub";
import { IdSchema, UpdateDocumentClassSchema } from "../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../utils/constants";
import { stripUndefined } from "../utils/strip-undefined";
import { fetchDocumentClassStep } from "./steps/fetch-document-class";

const UpdateInputSchema = object({
  id: IdSchema,
  patch: UpdateDocumentClassSchema,
});

export const updateDocumentClass = Workflow.name("dms.class.update")
  .input(UpdateInputSchema)
  .handler(async ({ id, patch }, ctx) => {
    const current = await ctx.step.run(fetchDocumentClassStep, { id });

    const updates = stripUndefined({
      color: patch.color,
      description: patch.description,
      fileNamingSchema: patch.fileNamingSchema,
      icon: patch.icon,
      name: patch.name,
      retentionDays: patch.retentionDays,
    });

    const [updated] = await ctx.db
      .update(dmsDocumentClass)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(dmsDocumentClass.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Document class "${id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        changes: ctx.audit.diff(
          { name: current.name, retentionDays: current.retentionDays },
          { name: updated.name, retentionDays: updated.retentionDays },
        ),
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.CLASS,
        newState: { name: updated.name, retentionDays: updated.retentionDays },
        previousState: {
          name: current.name,
          retentionDays: current.retentionDays,
        },
      });

      await ctx.pubsub.publish(CLASS_EVENTS.UPDATED, { classId: id });
    });

    return updated;
  });
