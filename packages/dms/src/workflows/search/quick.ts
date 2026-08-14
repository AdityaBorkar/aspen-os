import { Workflow } from "@aspen-os/platform/server";
import { object, parse, string } from "valibot";

import { quickSearch } from "../../services/search-service";
import { QuickSearchSchema } from "../../types";

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
