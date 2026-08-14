import { Workflow } from "@aspen-os/platform/server";
import { object, parse, string } from "valibot";

import {
  quickSearch,
  searchFiles,
  searchFolders,
  searchToFileViewConditions,
} from "../services/search-service";
import { QuickSearchSchema, SearchOptionsSchema } from "../types";
import { createFileView } from "./file-view.create";

const SearchInputSchema = object({
  options: SearchOptionsSchema,
  query: string(),
});

export const searchFilesWorkflow = Workflow.name("dms.search.full-text")
  .input(SearchInputSchema)
  .handler(async ({ options, query }, ctx) => {
    const actorId = ctx.actorId ?? "dms:system";
    const files = await searchFiles(ctx.db, {
      admin: actorId === "dms:admin",
      classId: options.classId,
      contentType: options.contentType,
      dateRange: options.dateRange,
      labels: options.labels,
      limit: options.limit ?? 50,
      offset: options.offset ?? 0,
      query,
      scope: options.scope ?? "mine",
      sizeRange: options.sizeRange,
      sort: options.sort,
      status: options.status,
      userId: actorId,
    });

    const folders = await searchFolders(ctx.db, {
      limit: options.limit ?? 50,
      offset: options.offset ?? 0,
      query,
    });

    return { files, folders };
  });

export const quickSearchWorkflow = Workflow.name("dms.search.quick")
  .input(object({ input: QuickSearchSchema, userId: string() }))
  .handler(async ({ input, userId }, ctx) => {
    const parsed = parse(QuickSearchSchema, input);
    return quickSearch(ctx.db, {
      admin: userId === "dms:admin",
      limit: parsed.limit,
      query: parsed.query,
      userId,
    });
  });

export const promoteSearchToView = Workflow.name("dms.search.promote-to-view")
  .input(
    object({
      name: string(),
      options: SearchOptionsSchema,
      ownerId: string(),
      query: string(),
    }),
  )
  .handler(async ({ query, options, name, ownerId }, ctx) => {
    const { filters, sort } = searchToFileViewConditions({ options, query });
    return createFileView.run(
      {
        input: {
          filters,
          isDefault: false,
          isShared: false,
          name,
          ownerId,
          sort,
        },
      },
      {
        actorId: ctx.actorId,
        audit: ctx.audit,
        db: ctx.db,
        pubsub: ctx.pubsub,
      },
    );
  });
