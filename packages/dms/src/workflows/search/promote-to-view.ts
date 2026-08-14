import { Workflow } from "@aspen-os/platform/server";
import { object, string } from "valibot";

import { searchToFileViewConditions } from "../../services/search-service";
import { SearchOptionsSchema } from "../../types";
import { createFileView } from "../file-view/create";

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
