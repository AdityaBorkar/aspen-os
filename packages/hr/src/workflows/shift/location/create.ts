import { shiftLocation } from "#/db-schemas";
import { CreateShiftLocationSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const InputSchema = object({
  input: CreateShiftLocationSchema,
});

export const createShiftLocation = Workflow.name("hr.shift.create-shift-location")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateShiftLocationSchema, input);

    const [result] = await ctx.db
      .insert(shiftLocation)
      .values({
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        name: parsed.name,
        radius: parsed.radius ?? 500,
      })
      .returning();

    return result;
  });
