import { dmsLabel } from "#/db-schemas";
import { assertLabelOwner, CreateLabelSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const CreateInputSchema = object({ input: CreateLabelSchema });

export const createLabel = Workflow.name("dms.label.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateLabelSchema, input);

    assertLabelOwner(parsed.isGlobal, parsed.ownerId);

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
