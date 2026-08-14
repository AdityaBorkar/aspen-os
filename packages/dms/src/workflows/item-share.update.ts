import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse, string } from "valibot";

import { dmsItemShare } from "../db-schemas";
import { UpdateItemShareSchema } from "../types";

const UpdateInputSchema = object({
  id: string(),
  input: UpdateItemShareSchema,
});

export const updateItemShare = Workflow.name("dms.item-share.update")
  .input(UpdateInputSchema)
  .handler(async ({ id, input }, ctx) => {
    const parsed = parse(UpdateItemShareSchema, input);

    const [updated] = await ctx.db
      .update(dmsItemShare)
      .set({ permission: parsed.permission })
      .where(eq(dmsItemShare.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Share with id "${id}" not found.`);
    }

    return updated;
  });
