import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

import { dmsLabel } from "../db-schemas";
import { IdSchema, UpdateLabelSchema } from "../types";
import { stripUndefined } from "../utils/strip-undefined";

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

    if (updates.isGlobal === false && updates.ownerId === null) {
      throw new Error(
        "Personal labels must have an ownerId. Set isGlobal=true for org-wide labels.",
      );
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
