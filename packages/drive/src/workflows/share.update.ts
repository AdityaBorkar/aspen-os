import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse, string } from "valibot";

import { driveShare } from "../db-schemas";
import { UpdateShareSchema } from "../types";

const UpdateInputSchema = object({
  id: string(),
  input: UpdateShareSchema,
});

export const updateShare = Workflow.name("drive.share.update")
  .input(UpdateInputSchema)
  .handler(async ({ id, input }, ctx) => {
    const parsed = parse(UpdateShareSchema, input);

    const [updated] = await ctx.db
      .update(driveShare)
      .set({ permission: parsed.permission })
      .where(eq(driveShare.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Share with id "${id}" not found.`);
    }

    return updated;
  });
