import { productsManufacturer } from "#/db-schemas";
import { UpdateManufacturerSchema } from "#/schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { stripUndefined } from "#/utils/strip-undefined";
import { fetchManufacturerStep } from "#/workflow-steps/fetch";
import { runAuditStep } from "#/workflows/audit";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, ne } from "drizzle-orm";
import { object, string } from "valibot";

const UpdateInputSchema = object({ id: string(), patch: UpdateManufacturerSchema });

export const updateManufacturer = Workflow.name("products.manufacturer.update")
  .input(UpdateInputSchema)
  .handler(async (input, ctx) => {
    await ctx.step.run(fetchManufacturerStep, { id: input.id });
    if (input.patch.name !== undefined) {
      const [conflict] = await ctx.db
        .select({ id: productsManufacturer.id })
        .from(productsManufacturer)
        .where(
          and(
            eq(productsManufacturer.name, input.patch.name),
            ne(productsManufacturer.id, input.id),
          ),
        )
        .limit(1);
      if (conflict) {
        throw new Error(`Manufacturer "${input.patch.name}" already exists.`);
      }
    }
    const updates = stripUndefined({
      country: input.patch.country,
      description: input.patch.description,
      is_disabled: input.patch.isDisabled,
      name: input.patch.name,
      website: input.patch.website,
    });
    const [updated] = await ctx.db
      .update(productsManufacturer)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(productsManufacturer.id, input.id))
      .returning();
    if (!updated) {
      throw new Error(`Manufacturer with id "${input.id}" not found.`);
    }
    await runAuditStep(ctx, {
      action: AUDIT_ACTION.UPDATED,
      changes: updates,
      crudAction: "update",
      entityId: updated.id,
      entityType: AUDIT_ENTITY_TYPE.MANUFACTURER,
    });
    return updated;
  });
