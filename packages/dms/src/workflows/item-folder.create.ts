import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

import { dmsFolder } from "../db-schemas";
import { ITEM_EVENTS } from "../pubsub";
import { getDmsConfig } from "../runtime";
import { checkNameUniqueness, computeFolderPath, getDepth } from "../services/item-path-service";
import { CreateFolderSchema } from "../types";

const CreateInputSchema = object({ input: CreateFolderSchema });

export const createItemFolder = Workflow.name("dms.folder.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateFolderSchema, input);
    const parentId = parsed.parentId ?? null;

    await ctx.step.run("check-name-uniqueness", async () => {
      await checkNameUniqueness({ name: parsed.name, parentId });
    });

    if (parentId) {
      await ctx.step.run("check-depth", async () => {
        const depth = await getDepth({ folderId: parentId });
        const md = getDmsConfig().maxNestingDepth;
        if (depth >= md - 1) {
          throw new Error(`Maximum nesting depth of ${md} would be exceeded.`);
        }
        return depth;
      });
    }

    const path = await ctx.step.run("compute-path", async () =>
      computeFolderPath({ name: parsed.name, parentId }),
    );

    const [folder] = await ctx.db
      .insert(dmsFolder)
      .values({
        color: parsed.color ?? null,
        description: parsed.description ?? null,
        name: parsed.name,
        ownerId: parsed.ownerId,
        parentId,
        path,
      })
      .returning();

    if (!folder) {
      throw new Error("Failed to create folder.");
    }

    await ctx.pubsub.publish(ITEM_EVENTS.FOLDER_CREATED, {
      folder: {
        id: folder.id,
        name: folder.name,
        ownerId: folder.ownerId,
        parentId: folder.parentId,
        path: folder.path,
      },
    });

    return folder;
  });
