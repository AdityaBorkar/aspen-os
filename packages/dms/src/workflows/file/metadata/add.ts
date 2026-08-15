import { dmsFile } from "#/db-schemas";
import { FILE_EVENTS } from "#/pubsub";
import { AddMetadataSchema, IdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchFileStep } from "#/workflow-steps/fetch-file";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const AddMetadataInputSchema = object({ id: IdSchema, input: AddMetadataSchema });

export const addFileMetadata = Workflow.name("dms.file.add-metadata")
  .input(AddMetadataInputSchema)
  .handler(async ({ id, input }, ctx) => {
    const file = await ctx.step.run(fetchFileStep, { id });
    const parsed = parse(AddMetadataSchema, input);

    const metadata = {
      ...(file.metadata as Record<string, unknown> | null),
      [parsed.key]: parsed.value,
    };

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
        changes: { [parsed.key]: parsed.value },
        fileId: id,
      });
    });

    return updated ?? file;
  });
