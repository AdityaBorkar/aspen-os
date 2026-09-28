import { productsBrand } from "#/db-schemas";
import { BRAND_EVENTS } from "#/pubsub";
import { UpdateBrandSchema } from "#/schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { stripUndefined } from "#/utils/strip-undefined";
import { fetchBrandStep } from "#/workflow-steps/fetch";
import { eventChanges, runAuditNotifyStep } from "#/workflows/audit";

import { Workflow } from "@aspen-os/platform/server";
import { eq, ne, and } from "drizzle-orm";
import { object, string } from "valibot";

const UpdateInputSchema = object({ id: string(), patch: UpdateBrandSchema });

export const updateBrand = Workflow.name("products.brand.update")
  .input(UpdateInputSchema)
  .handler(async (input, ctx) => {
    await ctx.step.run(fetchBrandStep, { id: input.id });

    if (input.patch.name !== undefined) {
      const [conflict] = await ctx.db
        .select({ id: productsBrand.id })
        .from(productsBrand)
        .where(and(eq(productsBrand.name, input.patch.name), ne(productsBrand.id, input.id)))
        .limit(1);
      if (conflict) {
        throw new Error(`Brand "${input.patch.name}" already exists.`);
      }
    }

    const updates = stripUndefined({
      description: input.patch.description,
      image_file_id: input.patch.imageFileId,
      is_disabled: input.patch.isDisabled,
      name: input.patch.name,
    });

    const [updated] = await ctx.db
      .update(productsBrand)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(productsBrand.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Brand with id "${input.id}" not found.`);
    }

    await runAuditNotifyStep(
      ctx,
      {
        action: AUDIT_ACTION.UPDATED,
        changes: updates,
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.BRAND,
      },
      BRAND_EVENTS.UPDATED,
      {
        brand: { id: updated.id, name: updated.name },
        changes: eventChanges(updates),
      },
    );

    return updated;
  });
