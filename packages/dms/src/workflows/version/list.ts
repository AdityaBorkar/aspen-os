import { Workflow } from "@aspen-os/platform/server";
import { desc, eq } from "drizzle-orm";
import { object } from "valibot";

import { dmsFileVersion } from "../../db-schemas";
import { IdSchema } from "../../types";
import { fetchFileStep } from "../../workflow-steps/fetch-file";

const ListVersionsInputSchema = object({ fileId: IdSchema });

export const listFileVersions = Workflow.name("dms.version.list")
  .input(ListVersionsInputSchema)
  .handler(async ({ fileId }, ctx) => {
    const file = await ctx.step.run(fetchFileStep, { id: fileId });

    const versions = await ctx.db
      .select()
      .from(dmsFileVersion)
      .where(eq(dmsFileVersion.fileId, fileId))
      .orderBy(desc(dmsFileVersion.version));

    return {
      current: {
        contentType: file.contentType,
        etag: file.etag,
        name: file.name,
        size: file.size,
        storageKey: file.storageKey,
        version: file.version,
      },
      currentVersion: file.version,
      history: versions,
    };
  });

export const getCurrentVersion = Workflow.name("dms.version.current")
  .input(ListVersionsInputSchema)
  .handler(async ({ fileId }, ctx) => ctx.step.run(fetchFileStep, { id: fileId }));
