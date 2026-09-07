import type { UploadBulkInput } from "#/types";
import { UploadBulkSchema } from "#/types";
import { uploadFile } from "#/workflows/file/upload";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const UploadBulkInputSchema = object({ input: UploadBulkSchema });

type BulkItem = UploadBulkInput["inputs"][number];

export const uploadBulkFiles = Workflow.name("dms.file.upload-bulk")
  .input(UploadBulkInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(UploadBulkSchema, input);
    const batchId = parsed.batchId ?? crypto.randomUUID();

    const runOne = async (index: number, item: BulkItem) => {
      try {
        const file = await uploadFile.run(
          { input: { ...item, batchId: item.batchId ?? batchId } },
          {
            actorId: ctx.actorId,
            audit: ctx.audit,
            config: ctx.config,
            db: ctx.db,
            pubsub: ctx.pubsub,
          },
        );
        return { file, index, ok: true as const };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : String(error),
          index,
          ok: false as const,
        };
      }
    };

    const files: Awaited<ReturnType<typeof uploadFile.run>>[] = [];
    const failed: { error: string; index: number }[] = [];
    const CONCURRENCY = 5;
    // oxlint-disable eslint/no-await-in-loop
    for (let start = 0; start < parsed.inputs.length; start += CONCURRENCY) {
      const chunk = parsed.inputs.slice(start, start + CONCURRENCY);
      const results = await Promise.all(chunk.map((item, offset) => runOne(start + offset, item)));
      for (const result of results) {
        if (result.ok) {
          files.push(result.file);
        } else {
          failed.push({ error: result.error, index: result.index });
        }
      }
    }
    // oxlint-enable eslint/no-await-in-loop

    return { batchId, failed, files, succeeded: files };
  });
