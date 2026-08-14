import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

import { UploadBulkSchema } from "../../../types";
import { uploadFile } from "../upload";

const UploadBulkInputSchema = object({ input: UploadBulkSchema });

export const uploadBulkFiles = Workflow.name("dms.file.upload-bulk")
  .input(UploadBulkInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(UploadBulkSchema, input);
    const batchId = crypto.randomUUID();

    const files = [];
    // oxlint-disable eslint/no-await-in-loop
    for (const item of parsed.inputs) {
      const file = await uploadFile.run(
        { input: { ...item, batchId } },
        {
          actorId: ctx.actorId,
          audit: ctx.audit,
          config: ctx.config,
          db: ctx.db,
          pubsub: ctx.pubsub,
        },
      );
      files.push(file);
    }
    // oxlint-enable eslint/no-await-in-loop

    return { batchId, files };
  });
