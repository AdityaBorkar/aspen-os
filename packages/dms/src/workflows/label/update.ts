import { dmsLabel } from "#/db-schemas";
import { assertLabelOwner, IdSchema, UpdateLabelSchema } from "#/types";
import { stripUndefined } from "#/utils/strip-undefined";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const UpdateInputSchema = object({ id: IdSchema, input: UpdateLabelSchema });

export const updateLabel = Workflow.name("dms.label.update")
  .input(UpdateInputSchema)
  .handler(async ({ id, input }, ctx) => {
    const parsed = parse(UpdateLabelSchema, input);

    const updates = stripUndefined({
      color: parsed.color,
      isGlobal: parsed.isGlobal,
      name: parsed.name,
      ownerId: parsed.ownerId,
    });

    if (updates.isGlobal !== undefined || updates.ownerId !== undefined) {
      const [current] = await ctx.db
        .select({ isGlobal: dmsLabel.isGlobal, ownerId: dmsLabel.ownerId })
        .from(dmsLabel)
        .where(eq(dmsLabel.id, id))
        .limit(1);
      const effectiveGlobal = updates.isGlobal ?? current?.isGlobal;
      const effectiveOwner = updates.ownerId !== undefined ? updates.ownerId : current?.ownerId;
      assertLabelOwner(effectiveGlobal, effectiveOwner);
    }

    const [updated] = await ctx.db
      .update(dmsLabel)
      .set({ ...updates })
      .where(eq(dmsLabel.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Label "${id}" not found.`);
    }

    return updated;
  });
