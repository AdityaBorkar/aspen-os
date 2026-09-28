import { accountingTermsTemplate } from "#/db-schemas/settings";

import { Workflow } from "@aspen-os/platform/server";
import { asc } from "drizzle-orm";
import { object } from "valibot";

export const listTermsTemplates = Workflow.name("accounting.terms.list")
  .input(object({}))
  .handler(async (_input, ctx) =>
    ctx.step.run("query", async () =>
      ctx.db.select().from(accountingTermsTemplate).orderBy(asc(accountingTermsTemplate.name)),
    ),
  );
