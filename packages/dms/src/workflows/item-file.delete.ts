import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { dmsFile } from "../db-schemas";
import { ITEM_EVENTS } from "../pubsub";
import { WithFileIdSchema } from "./item-utils";

export const deleteItemFile = Workflow.name("dms.file.delete")
  .input(WithFileIdSchema)
  .handler(async ({ id }, ctx) => {
    await ctx.step.run("fetch-file", async () => {
      const [row] = await ctx.db
        .select({ id: dmsFile.id })
        .from(dmsFile)
        .where(eq(dmsFile.id, id))
        .limit(1);
      if (!row) {
        throw new Error(`File with id "${id}" not found.`);
      }
      return row;
    });

    const [updated] = await ctx.db
      .update(dmsFile)
      .set({
        isTrashed: true,
        trashedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(dmsFile.id, id))
      .returning();

    if (!updated) {
      throw new Error(`File with id "${id}" not found.`);
    }

    await ctx.pubsub.publish(ITEM_EVENTS.TRASHED, {
      itemId: id,
      itemType: "file",
    });

    return updated;
  });
