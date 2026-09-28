import { productsItemGroup } from "#/db-schemas";
import { ITEM_GROUP_EVENTS } from "#/pubsub";
import { IdSchema } from "#/schemas";
import { assertTransition, groupLifecycleState } from "#/services/lifecycle";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchGroupStep } from "#/workflow-steps/fetch";
import { runAuditNotifyStep } from "#/workflows/audit";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const IdInputSchema = object({ id: IdSchema });

export const enableGroup = Workflow.name("products.group.enable")
  .input(IdInputSchema)
  .handler(async ({ id }, ctx) => {
    const current = await ctx.step.run(fetchGroupStep, { id });
    assertTransition("group", groupLifecycleState(current), "enabled");
    const [updated] = await ctx.db
      .update(productsItemGroup)
      .set({ is_disabled: false, updated_at: new Date() })
      .where(eq(productsItemGroup.id, id))
      .returning();
    if (!updated) {
      throw new Error(`Item group with id "${id}" not found.`);
    }
    await runAuditNotifyStep(
      ctx,
      {
        action: AUDIT_ACTION.ENABLED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.GROUP,
      },
      ITEM_GROUP_EVENTS.ENABLED,
      { itemGroupId: id },
    );
    return updated;
  });
