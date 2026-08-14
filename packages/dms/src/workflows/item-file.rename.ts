import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

import { dmsFile } from "../db-schemas";
import { ITEM_EVENTS } from "../pubsub";
import { checkNameUniqueness, computeFilePath } from "../services/item-path-service";
import { RenameItemFileSchema } from "../types";
import { FileIdSchema } from "./item-utils";
import { fetchItemFileStep } from "./steps/fetch-item-file";

const RenameInputSchema = object({
  id: FileIdSchema,
  input: RenameItemFileSchema,
});

export const renameItemFile = Workflow.name("dms.file.rename")
  .input(RenameInputSchema)
  .handler(async ({ id, input }, ctx) => {
    const file = await ctx.step.run(fetchItemFileStep, { id });
    const parsed = parse(RenameItemFileSchema, input);

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
      .update(dmsFile)
      .set({
        name: parsed.name,
        path: newPath,
        updatedAt: new Date(),
      })
      .where(eq(dmsFile.id, id))
      .returning();

    if (!updated) {
      throw new Error(`File with id "${id}" not found.`);
    }

    await ctx.pubsub.publish(ITEM_EVENTS.MOVED, {
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
