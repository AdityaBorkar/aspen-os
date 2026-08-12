import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

import { driveItemLabel } from "../db-schemas";
import { ApplyLabelSchema } from "../types";

const ApplyInputSchema = object({ input: ApplyLabelSchema });

export const applyLabel = Workflow.name("drive.label.apply")
  .input(ApplyInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ApplyLabelSchema, input);

    await ctx.db
      .insert(driveItemLabel)
      .values({
        appliedBy: parsed.appliedBy,
        itemId: parsed.itemId,
        itemType: parsed.itemType,
        labelId: parsed.labelId,
      })
      .onConflictDoNothing();

    return { applied: true };
  });
