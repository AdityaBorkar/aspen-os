import { masterEntityLabel, masterLabel } from "#/db-schemas";
import { LABEL_EVENTS } from "#/pubsub";
import { IdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const DeleteInputSchema = object({ id: IdSchema });

export const deleteLabel = Workflow.name("masters.label.delete")
  .input(DeleteInputSchema)
  .handler(async ({ id }, ctx) => {
    await ctx.db.delete(masterEntityLabel).where(eq(masterEntityLabel.label_id, id));

    const [deleted] = await ctx.db.delete(masterLabel).where(eq(masterLabel.id, id)).returning();

    if (!deleted) {
      throw new Error(`Label "${id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.DELETED,
        crudAction: "delete",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.LABEL,
      });

      await ctx.pubsub.publish(LABEL_EVENTS.REMOVED, { labelId: id });
    });

    return { deleted: true };
  });
