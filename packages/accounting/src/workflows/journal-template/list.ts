import { accountingJournalTemplate } from "#/db-schemas/settings";

import { Workflow } from "@aspen-os/platform/server";
import { asc } from "drizzle-orm";
import { object } from "valibot";

export const listJournalTemplates = Workflow.name("accounting.journal-template.list")
  .input(object({}))
  .handler(async (_input, ctx) =>
    ctx.step.run("query", async () =>
      ctx.db.select().from(accountingJournalTemplate).orderBy(asc(accountingJournalTemplate.name)),
    ),
  );
