import { healthcareCompany } from "#/db-schemas/admin";
import { toCompanyDto } from "#/workflow-steps/fetch-admin";

import { Workflow } from "@aspen-os/platform/server";
import { asc } from "drizzle-orm";
import { object } from "valibot";

const GetCompanyInputSchema = object({ input: object({}) });

export const getCompany = Workflow.name("healthcare.admin.get-company")
  .input(GetCompanyInputSchema)
  .handler(async (_args, ctx) => {
    const [row] = await ctx.step.run("fetch-company", async () =>
      ctx.db.select().from(healthcareCompany).orderBy(asc(healthcareCompany.created_at)).limit(1),
    );
    return row ? toCompanyDto(row) : null;
  });
