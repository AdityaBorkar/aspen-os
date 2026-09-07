import { normalizeSearchRanges } from "#/schemas/search";
import { searchFiles, searchFolders } from "#/services/search-service";
import { SearchInputSchema } from "#/workflows/search/shared";

import { Workflow } from "@aspen-os/platform/server";

export const searchFilesWorkflow = Workflow.name("dms.search.full-text")
  .input(SearchInputSchema)
  .handler(async ({ options, query }, ctx) => {
    const actorId = ctx.actorId ?? "dms:system";
    const { dateRange, sizeRange } = normalizeSearchRanges(options);
    const files = await searchFiles(ctx.db, {
      admin: actorId === "dms:admin",
      classId: options.classId,
      contentType: options.contentType,
      dateRange,
      labels: options.labels,
      limit: options.limit ?? 50,
      offset: options.offset ?? 0,
      query,
      scope: options.scope ?? "my_files",
      sizeRange,
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
