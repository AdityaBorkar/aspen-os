import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

import { UploadBulkSchema } from "../types";
import { uploadDocument } from "./document.upload";

const UploadBulkInputSchema = object({ input: UploadBulkSchema });

export const uploadBulkDocuments = Workflow.name("dms.document.upload-bulk")
  .input(UploadBulkInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(UploadBulkSchema, input);
    const batchId = crypto.randomUUID();

    const documents = [];
    // oxlint-disable eslint/no-await-in-loop
    for (const item of parsed.inputs) {
      const doc = await uploadDocument.run(
        { input: { ...item, batchId } },
        {
          actorId: ctx.actorId,
          audit: ctx.audit,
          config: ctx.config,
          db: ctx.db,
          pubsub: ctx.pubsub,
        },
      );
      documents.push(doc);
    }
    // oxlint-enable eslint/no-await-in-loop

    return { batchId, documents };
  });
