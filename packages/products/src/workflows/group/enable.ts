import { productsItemGroup } from "#/db-schemas";
import { IdSchema } from "#/schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchGroupStep } from "#/workflow-steps/fetch-group";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const IdInputSchema = object({ id: IdSchema });

export const enableGroup = Workflow.name("products.group.enable")
  .input(IdInputSchema)
  .handler(async ({ id }, ctx) => {
    await ctx.step.run(fetchGroupStep, { id });
    const [updated] = await ctx.db
      .update(productsItemGroup)
      .set({ is_disabled: false, updated_at: new Date() })
      .where(eq(productsItemGroup.id, id))
      .returning();
    if (!updated) {
      throw new Error(`Item group with id "${id}" not found.`);
    }
    await ctx.step.run("audit", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.ENABLED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.GROUP,
      });
    });
    return updated;
  });
