import { Workflow } from "@aspen-os/platform/server";
import { object, parse, string } from "valibot";

import {
  quickSearch,
  searchDocuments,
  searchToViewConditions,
} from "../services/search-service";
import { QuickSearchSchema, SearchOptionsSchema } from "../types";
import { createView } from "./view.create";

const SearchInputSchema = object({
  options: SearchOptionsSchema,
  query: string(),
});

export const searchDocumentsWorkflow = Workflow.name("dms.search.full-text")
  .input(SearchInputSchema)
  .handler(async ({ options, query }, ctx) => {
    const actorId = ctx.actorId ?? "dms:system";
    const result = await searchDocuments(ctx.db, {
      admin: actorId === "dms:admin",
      classId: options.classId,
      contentType: options.contentType,
      dateRange: options.dateRange,
      limit: options.limit ?? 50,
      offset: options.offset ?? 0,
      query,
      scope: options.scope ?? "mine",
      sizeRange: options.sizeRange,
      sort: options.sort,
      status: options.status,
      tags: options.tags,
      userId: actorId,
    });
    return result;
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
    const { filters, sort } = searchToViewConditions({ options, query });
    return createView.run(
      {
        input: {
          filters,
          isDefault: false,
          isShared: false,
          name,
          ownerId: ownerId,
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
