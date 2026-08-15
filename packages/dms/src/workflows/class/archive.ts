import { dmsClass, dmsFile } from "#/db-schemas";
import { CLASS_EVENTS } from "#/pubsub";
import { IdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchClassStep } from "#/workflow-steps/fetch-class";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object } from "valibot";

const ArchiveInputSchema = object({ id: IdSchema });

export const archiveClass = Workflow.name("dms.class.archive")
  .input(ArchiveInputSchema)
  .handler(async ({ id }, ctx) => {
    const cls = await ctx.step.run(fetchClassStep, { id });

    if (!cls.isActive) {
      throw new Error(`Class "${id}" is already archived.`);
    }

    const [triaged] = await ctx.db
      .select({ id: dmsFile.id })
      .from(dmsFile)
      .where(and(eq(dmsFile.classId, id), eq(dmsFile.status, "triaged")))
      .limit(1);

    if (triaged) {
      throw new Error(`Class "${id}" cannot be archived while triaged files reference it.`);
    }

    const [updated] = await ctx.db
      .update(dmsClass)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(dmsClass.id, id))
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
