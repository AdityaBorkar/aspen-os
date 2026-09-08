import { assertLabelOwner, CreateLabelSchema } from "#/types";

import { masterLabel } from "@aspen-os/masters";
import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const CreateInputSchema = object({ input: CreateLabelSchema });

export const createLabel = Workflow.name("dms.label.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateLabelSchema, input);

    assertLabelOwner(parsed.isGlobal, parsed.ownerId);

    const scopeType = parsed.isGlobal ? null : "user";
    const scopeId = parsed.isGlobal ? null : (parsed.ownerId ?? null);

    const [label] = await ctx.db
      .insert(masterLabel)
      .values({
        color: parsed.color,
        name: parsed.name,
        scope_id: scopeId,
        scope_type: scopeType,
      })
      .returning();

    return label;
  });
