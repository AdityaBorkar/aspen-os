import { dmsFile } from "#/db-schemas";
import { FILE_EVENTS } from "#/pubsub";
import { IdSchema, RemoveMetadataSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchFileStep } from "#/workflow-steps/fetch-file";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const RemoveMetadataInputSchema = object({ id: IdSchema, input: RemoveMetadataSchema });

export const removeFileMetadata = Workflow.name("dms.file.remove-metadata")
  .input(RemoveMetadataInputSchema)
  .handler(async ({ id, input }, ctx) => {
    const file = await ctx.step.run(fetchFileStep, { id });
    const parsed = parse(RemoveMetadataSchema, input);

    const metadata = { ...((file.metadata as Record<string, unknown> | null) ?? {}) };
    delete metadata[parsed.key];

    const [updated] = await ctx.db
      .update(dmsFile)
      .set({ metadata, updatedAt: new Date() })
      .where(eq(dmsFile.id, id))
      .returning();

    if (!updated) {
      throw new Error(`File "${id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.FILE,
        metadata: { key: parsed.key },
        newState: { metadata },
        previousState: { metadata: file.metadata },
      });

      await ctx.pubsub.publish(FILE_EVENTS.UPDATED, {
        changes: { [parsed.key]: null },
        fileId: id,
      });
    });

    return updated ?? file;
  });
