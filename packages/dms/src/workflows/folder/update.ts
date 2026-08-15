import { dmsFolder } from "#/db-schemas";
import { UpdateFolderSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse, string } from "valibot";

const UpdateInputSchema = object({
  id: string(),
  input: UpdateFolderSchema,
});

export const updateFolder = Workflow.name("dms.folder.update")
  .input(UpdateInputSchema)
  .handler(async ({ id, input }, ctx) => {
    await ctx.step.run("check-exists", async () => {
      const [row] = await ctx.db
        .select({ id: dmsFolder.id })
        .from(dmsFolder)
        .where(eq(dmsFolder.id, id))
        .limit(1);
      if (!row) {
        throw new Error(`Folder with id "${id}" not found.`);
      }
      return row;
    });

    const parsed = parse(UpdateFolderSchema, input);

    const [updated] = await ctx.db
      .update(dmsFolder)
      .set({
        color: parsed.color,
        description: parsed.description,
        updatedAt: new Date(),
      })
      .where(eq(dmsFolder.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Folder with id "${id}" not found.`);
    }
    return updated;
  });
