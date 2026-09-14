import { healthcareTemplate } from "#/db-schemas/admin";
import { TemplateFiltersSchema } from "#/schemas/admin";
import { toTemplateDto } from "#/workflow-steps/fetch-admin";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { object, parse } from "valibot";

const ListTemplatesInputSchema = object({ input: TemplateFiltersSchema });

export const listTemplates = Workflow.name("healthcare.admin.list-templates")
  .input(ListTemplatesInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(TemplateFiltersSchema, input);
    const rows = await ctx.step.run("list-templates", async () => {
      const conditions: SQL[] = [eq(healthcareTemplate.status, "active")];
      if (parsed.branchId) {
        conditions.push(eq(healthcareTemplate.branch_id, parsed.branchId));
      }
      if (parsed.kind) {
        conditions.push(eq(healthcareTemplate.kind, parsed.kind));
      }
      return ctx.db
        .select()
        .from(healthcareTemplate)
        .where(and(...conditions))
        .orderBy(desc(healthcareTemplate.created_at))
        .limit(parsed.limit ?? 100)
        .offset(parsed.offset ?? 0);
    });
    return rows.map(toTemplateDto);
  });
