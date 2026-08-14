import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { driveFile } from "../db-schemas";
import { DRIVE_EVENTS } from "../pubsub";
import { WithFileIdSchema } from "./utils";

export const deleteFile = Workflow.name("drive.file.delete")
  .input(WithFileIdSchema)
  .handler(async ({ id }, ctx) => {
    await ctx.step.run("fetch-file", async () => {
      const [row] = await ctx.db
        .select({ id: driveFile.id })
        .from(driveFile)
        .where(eq(driveFile.id, id))
        .limit(1);
      if (!row) {
        throw new Error(`File with id "${id}" not found.`);
      }
      return row;
    });

    const [updated] = await ctx.db
      .update(driveFile)
      .set({
        isTrashed: true,
        trashedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(driveFile.id, id))
      .returning();

    if (!updated) {
      throw new Error(`File with id "${id}" not found.`);
    }

    await ctx.pubsub.publish(DRIVE_EVENTS.TRASHED, {
      itemId: id,
      itemType: "file",
    });

    return updated;
  });
