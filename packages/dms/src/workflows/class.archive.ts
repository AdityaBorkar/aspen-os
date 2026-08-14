import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object } from "valibot";

import { dmsDocument, dmsDocumentClass } from "../db-schemas";
import { CLASS_EVENTS } from "../pubsub";
import { IdSchema } from "../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../utils/constants";
import { fetchDocumentClassStep } from "../workflow-steps/fetch-document-class";

const ArchiveInputSchema = object({ id: IdSchema });

export const archiveDocumentClass = Workflow.name("dms.class.archive")
  .input(ArchiveInputSchema)
  .handler(async ({ id }, ctx) => {
    const cls = await ctx.step.run(fetchDocumentClassStep, { id });

    if (!cls.isActive) {
      throw new Error(`Document class "${id}" is already archived.`);
    }

    const [triaged] = await ctx.db
      .select({ id: dmsDocument.id })
      .from(dmsDocument)
      .where(and(eq(dmsDocument.classId, id), eq(dmsDocument.status, "triaged")))
      .limit(1);

    if (triaged) {
      throw new Error(
        `Document class "${id}" cannot be archived while triaged documents reference it.`,
      );
    }

    const [updated] = await ctx.db
      .update(dmsDocumentClass)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(dmsDocumentClass.id, id))
      .returning();

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.CLASS,
        newState: { isActive: false },
        previousState: { isActive: true },
      });

      await ctx.pubsub.publish(CLASS_EVENTS.ARCHIVED, { classId: id });
    });

    return updated ?? cls;
  });
