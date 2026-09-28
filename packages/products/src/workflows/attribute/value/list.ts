import { productsAttributeValue } from "#/db-schemas";
import { ListAttributeValuesSchema } from "#/schemas";

import { Workflow } from "@aspen-os/platform/server";
import { asc, eq } from "drizzle-orm";

export const listAttributeValues = Workflow.name("products.attribute.value.list")
  .input(ListAttributeValuesSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () =>
      ctx.db
        .select()
        .from(productsAttributeValue)
        .where(eq(productsAttributeValue.attribute_id, input.attributeId))
        .orderBy(asc(productsAttributeValue.sort_order)),
    ),
  );
