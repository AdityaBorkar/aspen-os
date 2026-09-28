import { productsManufacturer } from "#/db-schemas";
import { CreateManufacturerSchema } from "#/schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const CreateInputSchema = object({ input: CreateManufacturerSchema });

export const createManufacturer = Workflow.name("products.manufacturer.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateManufacturerSchema, input);
    const [existing] = await ctx.db
      .select({ id: productsManufacturer.id })
      .from(productsManufacturer)
      .where(eq(productsManufacturer.name, parsed.name))
      .limit(1);
    if (existing) {
      throw new Error(`Manufacturer "${parsed.name}" already exists.`);
    }
    const [row] = await ctx.db
      .insert(productsManufacturer)
      .values({
        country: parsed.country ?? null,
        description: parsed.description ?? null,
        name: parsed.name,
        website: parsed.website ?? null,
      })
      .returning();
    if (!row) {
      throw new Error("Failed to create manufacturer.");
    }
    await ctx.step.run("audit", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.MANUFACTURER,
        newState: { name: row.name },
      });
    });
    return row;
  });
