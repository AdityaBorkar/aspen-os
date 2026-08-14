import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

import { dmsFile } from "../../db-schemas";
import { FILE_EVENTS } from "../../pubsub";
import { checkNameUniqueness, computeFilePath } from "../../services/path-service";
import { FileIdSchema, RenameFileSchema } from "../../types";
import { fetchFileStep } from "../../workflow-steps/fetch-file";

const RenameInputSchema = object({ id: FileIdSchema, input: RenameFileSchema });

export const renameFile = Workflow.name("dms.file.rename")
  .input(RenameInputSchema)
  .handler(async ({ id, input }, ctx) => {
    const file = await ctx.step.run(fetchFileStep, { id });
    const parsed = parse(RenameFileSchema, input);

    if (file.folderId) {
      await ctx.step.run("check-name-uniqueness", async () => {
        await checkNameUniqueness({ excludeId: id, name: parsed.name, parentId: file.folderId });
      });
    }

    const newPath = await ctx.step.run("compute-path", async () =>
      computeFilePath({ folderId: file.folderId, name: parsed.name }),
    );
    const oldPath = file.path;

    const [updated] = await ctx.db
      .update(dmsFile)
      .set({ name: parsed.name, path: newPath, updatedAt: new Date() })
      .where(eq(dmsFile.id, id))
      .returning();

    if (!updated) {
      throw new Error(`File "${id}" not found.`);
    }

    await ctx.pubsub.publish(FILE_EVENTS.MOVED, {
      file: { id, name: parsed.name, path: newPath },
      newPath,
      oldPath,
    });

    return updated ?? file;
  });
