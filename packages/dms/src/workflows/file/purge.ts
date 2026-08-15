import { FILE_EVENTS } from "#/pubsub";
import { deleteFilePermanently, isFileHeld } from "#/services/purge-service";
import { FileIdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchFileStep } from "#/workflow-steps/fetch-file";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const PurgeInputSchema = object({ id: FileIdSchema });

export const purgeFile = Workflow.name("dms.file.purge")
  .input(PurgeInputSchema)
  .handler(async ({ id }, ctx) => {
    const file = await ctx.step.run(fetchFileStep, { id });

    if (await isFileHeld(ctx.db, id)) {
      throw new Error(`File "${id}" is under an active legal hold and cannot be purged.`);
    }

    const keys = await ctx.step.run("purge", async () => deleteFilePermanently(ctx.db, id));

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.PURGED,
        crudAction: "delete",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.FILE,
        metadata: { storageKey: keys[0] ?? null },
      });

      await ctx.pubsub.publish(FILE_EVENTS.PURGED, {
        fileId: id,
        storageKey: keys[0] ?? file.storageKey,
      });
    });

    return { deleted: true, freedStorageKeys: keys };
  });
