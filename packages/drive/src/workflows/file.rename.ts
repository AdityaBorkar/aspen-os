import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

import { driveFile } from "../db-schemas";
import { DRIVE_EVENTS } from "../pubsub";
import { checkNameUniqueness, computeFilePath } from "../services/path-service";
import { RenameFileSchema } from "../types";
import { fetchFileStep } from "../workflow-steps/fetch-file";
import { FileIdSchema } from "./utils";

const RenameInputSchema = object({ id: FileIdSchema, input: RenameFileSchema });

export const renameFile = Workflow.name("drive.file.rename")
  .input(RenameInputSchema)
  .handler(async ({ id, input }, ctx) => {
    const file = await ctx.step.run(fetchFileStep, { id });
    const parsed = parse(RenameFileSchema, input);

    await ctx.step.run("check-name-uniqueness", async () => {
      await checkNameUniqueness({
        excludeId: id,
        name: parsed.name,
        parentId: file.folderId,
      });
    });

    const oldPath = file.path;
    const newPath = await ctx.step.run("compute-path", async () =>
      computeFilePath({ folderId: file.folderId, name: parsed.name }),
    );

    const [updated] = await ctx.db
      .update(driveFile)
      .set({
        name: parsed.name,
        path: newPath,
        updatedAt: new Date(),
      })
      .where(eq(driveFile.id, id))
      .returning();

    if (!updated) {
      throw new Error(`File with id "${id}" not found.`);
    }

    await ctx.pubsub.publish(DRIVE_EVENTS.MOVED, {
      item: {
        id: updated.id,
        name: updated.name,
        path: updated.path,
      },
      itemType: "file",
      newPath,
      oldPath,
    });

    return updated;
  });
