import { accountingRfq } from "#/db-schemas/purchase";

import { Workflow } from "@aspen-os/platform/server";
import { desc } from "drizzle-orm";
import { object } from "valibot";

export const listRfqs = Workflow.name("accounting.rfq.list")
  .input(object({}))
  .handler(async (_input, ctx) =>
    ctx.step.run("query", async () =>
      ctx.db.select().from(accountingRfq).orderBy(desc(accountingRfq.created_at)),
    ),
  );
