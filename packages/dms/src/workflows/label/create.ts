import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

import { dmsLabel } from "../../db-schemas";
import { CreateLabelSchema } from "../../types";

const CreateInputSchema = object({ input: CreateLabelSchema });

export const createLabel = Workflow.name("dms.label.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateLabelSchema, input);

    if (!parsed.isGlobal && !parsed.ownerId) {
      throw new Error(
        "Personal labels must have an ownerId. Set isGlobal=true for org-wide labels.",
      );
    }

    const [label] = await ctx.db
      .insert(dmsLabel)
      .values({
        color: parsed.color,
        isGlobal: parsed.isGlobal,
        name: parsed.name,
        ownerId: parsed.ownerId ?? null,
      })
      .returning();

    return label;
  });
