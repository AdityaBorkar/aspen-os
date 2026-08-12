import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

import { designation } from "../db-schemas";
import { CreateDesignationSchema } from "../types";

const InputSchema = object({
  input: CreateDesignationSchema,
});

export const createDesignation = Workflow.name("hr.setup.create-designation")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateDesignationSchema, input);

    const [result] = await ctx.db
      .insert(designation)
      .values({
        description: parsed.description ?? null,
        name: parsed.name,
      })
      .returning();

    return result;
  });
