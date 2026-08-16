import { masterEntity } from "#/db-schemas";
import { ENTITY_EVENTS } from "#/pubsub";
import { WithIdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchEntityStep } from "#/workflow-steps/fetch-entity";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const deleteEntity = Workflow.name("masters.entity.delete")
  .input(WithIdSchema)
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchEntityStep, { id: input.id });

    await ctx.db.delete(masterEntity).where(eq(masterEntity.id, input.id));

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.DELETED,
        crudAction: "delete",
        entityId: current.id,
        entityType: AUDIT_ENTITY_TYPE.ENTITY,
        metadata: { name: current.name, type: current.type },
      });

      await ctx.pubsub.publish(ENTITY_EVENTS.REMOVED, {
        entity: { id: current.id, name: current.name, type: current.type },
      });
    });

    return { removed: true };
  });
