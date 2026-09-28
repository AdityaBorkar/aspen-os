import { productsAttribute } from "#/db-schemas";
import { CreateAttributeSchema } from "#/schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const CreateInputSchema = object({ input: CreateAttributeSchema });

export const createAttribute = Workflow.name("products.attribute.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateAttributeSchema, input);
    const [existing] = await ctx.db
      .select({ id: productsAttribute.id })
      .from(productsAttribute)
      .where(eq(productsAttribute.name, parsed.name))
      .limit(1);
    if (existing) {
      throw new Error(`Attribute "${parsed.name}" already exists.`);
    }
    const [row] = await ctx.db
      .insert(productsAttribute)
      .values({
        is_numeric: parsed.isNumeric ?? false,
        name: parsed.name,
        unit: parsed.unit ?? null,
      })
      .returning();
    if (!row) {
      throw new Error("Failed to create attribute.");
    }
    await ctx.step.run("audit", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.ATTRIBUTE,
        newState: { name: row.name },
      });
    });
    return row;
  });
