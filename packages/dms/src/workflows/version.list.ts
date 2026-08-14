import { Workflow } from "@aspen-os/platform/server";
import { desc, eq } from "drizzle-orm";
import { object } from "valibot";

import { dmsDocumentVersion } from "../db-schemas";
import { IdSchema } from "../types";
import { fetchDocumentStep } from "./steps/fetch-document";

const ListVersionsInputSchema = object({ documentId: IdSchema });

export const listDocumentVersions = Workflow.name("dms.version.list")
  .input(ListVersionsInputSchema)
  .handler(async ({ documentId }, ctx) => {
    const doc = await ctx.step.run(fetchDocumentStep, { documentId });

    const versions = await ctx.db
      .select()
      .from(dmsDocumentVersion)
      .where(eq(dmsDocumentVersion.documentId, documentId))
      .orderBy(desc(dmsDocumentVersion.version));

    return {
      current: {
        contentType: doc.contentType,
        etag: doc.etag,
        name: doc.name,
        size: doc.size,
        storageKey: doc.storageKey,
        version: doc.version,
      },
      currentVersion: doc.version,
      history: versions,
    };
  });

export const getCurrentVersion = Workflow.name("dms.version.current")
  .input(ListVersionsInputSchema)
  .handler(async ({ documentId }, ctx) => ctx.step.run(fetchDocumentStep, { documentId }));
