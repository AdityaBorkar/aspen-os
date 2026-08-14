import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse, string } from "valibot";

import { driveFolder } from "../db-schemas";
import { DRIVE_EVENTS } from "../pubsub";
import { getDriveConfig } from "../runtime";
import {
  cascadePaths,
  checkNameUniqueness,
  getDepth,
  getFolderPath,
  getSubtreeMaxDepth,
  wouldCreateCycle,
} from "../services/path-service";
import { MoveFolderSchema } from "../types";
import { fetchFolderStep } from "../workflow-steps/fetch-folder";

const MoveInputSchema = object({ id: string(), input: MoveFolderSchema });

export const moveFolder = Workflow.name("drive.folder.move")
  .input(MoveInputSchema)
  .handler(async ({ id, input }, ctx) => {
    const fetched = await ctx.step.run(fetchFolderStep, { id });
    const parsed = parse(MoveFolderSchema, input);
    const newParentId = parsed.newParentId ?? null;

    if (
      await ctx.step.run("check-cycle", async () => wouldCreateCycle({ folderId: id, newParentId }))
    ) {
      throw new Error("Cannot move a folder into itself or its descendants.");
    }

    await ctx.step.run("check-name-uniqueness", async () => {
      await checkNameUniqueness({
        excludeId: id,
        name: fetched.name,
        parentId: newParentId,
      });
    });

    if (newParentId) {
      const parentDepth = await ctx.step.run("get-parent-depth", async () =>
        getDepth({ folderId: newParentId }),
      );
      const subtreeDepth = await ctx.step.run("get-subtree-depth", async () =>
        getSubtreeMaxDepth({ folderPath: fetched.path }),
      );
      const md = getDriveConfig().maxNestingDepth;
      if (parentDepth + 1 + subtreeDepth >= md) {
        throw new Error(`Maximum nesting depth of ${md} would be exceeded.`);
      }
    }

    const oldPath = fetched.path;
    const parentPath = newParentId
      ? await ctx.step.run("get-parent-path", async () => getFolderPath({ folderId: newParentId }))
      : "";
    const newPath = `${parentPath}/${fetched.name}`;

    const [updated] = await ctx.db
      .update(driveFolder)
      .set({ parentId: newParentId, path: newPath, updatedAt: new Date() })
      .where(eq(driveFolder.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Folder with id "${id}" not found.`);
    }

    await ctx.step.run("cascade-paths", async () => {
      await cascadePaths({ newPath, oldPath }, ctx.db);
    });

    await ctx.pubsub.publish(DRIVE_EVENTS.MOVED, {
      item: { id: updated.id, name: updated.name, path: updated.path },
      itemType: "folder",
      newPath,
      oldPath,
    });

    return updated;
  });
