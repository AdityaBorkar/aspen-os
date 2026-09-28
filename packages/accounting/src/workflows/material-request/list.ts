import { accountingMaterialRequest } from "#/db-schemas/purchase";
import { MaterialRequestFiltersSchema } from "#/schemas/purchase";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const listMaterialRequests = Workflow.name("accounting.material-request.list")
  .input(MaterialRequestFiltersSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const conditions: SQL[] = [];
      if (input.requestType) {
        conditions.push(eq(accountingMaterialRequest.request_type, input.requestType));
      }
      return ctx.db
        .select()
        .from(accountingMaterialRequest)
        .where(and(...conditions))
        .orderBy(desc(accountingMaterialRequest.created_at));
    }),
  );
