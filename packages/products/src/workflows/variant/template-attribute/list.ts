import { productsTemplateAttribute } from "#/db-schemas";
import { ListTemplateAttributesSchema } from "#/schemas";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const listTemplateAttributes = Workflow.name("products.variant.template-attribute.list")
  .input(ListTemplateAttributesSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () =>
      ctx.db
        .select()
        .from(productsTemplateAttribute)
        .where(eq(productsTemplateAttribute.template_item_id, input.templateItemId)),
    ),
  );
