import { masterEntity } from "#/db-schemas";
import { ENTITY_EVENTS } from "#/pubsub";
import { EntitySetStatusSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchEntityStep } from "#/workflow-steps/fetch-entity";

import type { EntityStatus } from "@aspen-os/constants";
import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

function canTransition(from: EntityStatus, to: EntityStatus): boolean {
  switch (from) {
    case "active": {
      return to === "archived" || to === "inactive";
    }
    case "archived": {
      return false;
    }
    case "inactive": {
      return to === "active" || to === "archived";
    }
  }
}

export const setEntityStatus = Workflow.name("masters.entity.set-status")
  .input(EntitySetStatusSchema)
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchEntityStep, { id: input.id });

    if (current.status === input.status) {
      return current;
    }

    if (!canTransition(current.status, input.status)) {
      throw new Error(
        `Cannot transition entity status from "${current.status}" to "${input.status}".`,
      );
    }

    const [updated] = await ctx.db
      .update(masterEntity)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(masterEntity.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Entity with id "${input.id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.ENTITY,
        metadata: { fromStatus: current.status, toStatus: updated.status },
      });

      await ctx.pubsub.publish(ENTITY_EVENTS.UPDATED, {
        changes: { status: updated.status },
        entity: { id: updated.id, name: updated.name, type: updated.type },
      });
    });

    return updated;
  });
