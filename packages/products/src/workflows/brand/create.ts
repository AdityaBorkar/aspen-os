import { productsBrand } from "#/db-schemas";
import { BRAND_EVENTS } from "#/pubsub";
import { CreateBrandSchema } from "#/schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { runAuditNotifyStep } from "#/workflows/audit";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const CreateInputSchema = object({ input: CreateBrandSchema });

export const createBrand = Workflow.name("products.brand.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateBrandSchema, input);

    const [existing] = await ctx.db
      .select({ id: productsBrand.id })
      .from(productsBrand)
      .where(eq(productsBrand.name, parsed.name))
      .limit(1);
    if (existing) {
      throw new Error(`Brand "${parsed.name}" already exists.`);
    }

    const [brand] = await ctx.db
      .insert(productsBrand)
      .values({
        description: parsed.description ?? null,
        image_file_id: parsed.imageFileId ?? null,
        name: parsed.name,
      })
      .returning();

    if (!brand) {
      throw new Error("Failed to create brand.");
    }

    await runAuditNotifyStep(
      ctx,
      {
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: brand.id,
        entityType: AUDIT_ENTITY_TYPE.BRAND,
        newState: { name: brand.name },
      },
      BRAND_EVENTS.CREATED,
      {
        brand: { id: brand.id, name: brand.name },
      },
    );

    return brand;
  });
