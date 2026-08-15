import { dmsFile } from "#/db-schemas";
import { FILE_EVENTS } from "#/pubsub";
import { checkNameUniqueness, computeFilePath } from "#/services/path-service";
import { FileIdSchema, MoveFileSchema } from "#/types";
import { fetchFileStep } from "#/workflow-steps/fetch-file";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const MoveInputSchema = object({ id: FileIdSchema, input: MoveFileSchema });

export const moveFile = Workflow.name("dms.file.move")
  .input(MoveInputSchema)
  .handler(async ({ id, input }, ctx) => {
    const file = await ctx.step.run(fetchFileStep, { id });
    const parsed = parse(MoveFileSchema, input);
    const newFolderId = parsed.newFolderId ?? null;

    const newPath = newFolderId
      ? await ctx.step.run("compute-path", async () =>
          computeFilePath({ folderId: newFolderId, name: file.name }),
        )
      : null;

    if (newFolderId) {
      await ctx.step.run("check-name-uniqueness", async () => {
        await checkNameUniqueness({ excludeId: id, name: file.name, parentId: newFolderId });
      });
    }

    const [updated] = await ctx.db
      .update(dmsFile)
      .set({ folderId: newFolderId, path: newPath, updatedAt: new Date() })
      .where(eq(dmsFile.id, id))
      .returning();

    if (!updated) {
      throw new Error(`File "${id}" not found.`);
    }

    await ctx.pubsub.publish(FILE_EVENTS.MOVED, {
      file: { id, name: file.name, path: newPath },
      newPath,
      oldPath: file.path,
    });

    return updated ?? file;
  });
