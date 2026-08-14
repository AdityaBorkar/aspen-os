import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse, string } from "valibot";

import { dmsFolder } from "../db-schemas";
import { ITEM_EVENTS } from "../pubsub";
import { cascadePaths, checkNameUniqueness, getFolderPath } from "../services/item-path-service";
import { RenameFolderSchema } from "../types";
import { fetchItemFolderStep } from "./steps/fetch-item-folder";

const RenameInputSchema = object({ id: string(), input: RenameFolderSchema });

export const renameItemFolder = Workflow.name("dms.folder.rename")
  .input(RenameInputSchema)
  .handler(async ({ id, input }, ctx) => {
    const fetched = await ctx.step.run(fetchItemFolderStep, { id });
    const parsed = parse(RenameFolderSchema, input);

    await ctx.step.run("check-name-uniqueness", async () => {
      await checkNameUniqueness({
        excludeId: id,
        name: parsed.name,
        parentId: fetched.parentId,
      });
    });

    const oldPath = fetched.path;
    const parentPath = fetched.parentId
      ? await ctx.step.run("get-parent-path", async () =>
          getFolderPath({ folderId: fetched.parentId as string }),
        )
      : "";
    const newPath = `${parentPath}/${parsed.name}`;

    const [updated] = await ctx.db
      .update(dmsFolder)
      .set({ name: parsed.name, path: newPath, updatedAt: new Date() })
      .where(eq(dmsFolder.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Folder with id "${id}" not found.`);
    }

    await ctx.step.run("cascade-paths", async () => {
      await cascadePaths({ newPath, oldPath }, ctx.db);
    });

    await ctx.pubsub.publish(ITEM_EVENTS.FOLDER_RENAMED, {
      folder: { id: updated.id, name: updated.name, path: updated.path },
      oldName: fetched.name,
    });

    return updated;
  });
