import { healthcareCompany } from "#/db-schemas/admin";
import { SaveCompanySchema } from "#/schemas/admin";
import { AUDIT_ACTION } from "#/utils/constants";
import { toCompanyDto } from "#/workflow-steps/fetch-admin";

import { Workflow } from "@aspen-os/platform/server";
import { asc, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const SaveCompanyInputSchema = object({ input: SaveCompanySchema });

export const saveCompany = Workflow.name("healthcare.admin.save-company")
  .input(SaveCompanyInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(SaveCompanySchema, input);
    const existing = await ctx.step.run("fetch-company", async () => {
      const [row] = await ctx.db
        .select()
        .from(healthcareCompany)
        .orderBy(asc(healthcareCompany.created_at))
        .limit(1);
      return row ?? null;
    });
    const [row] = await ctx.step.run("upsert-company", async () => {
      if (existing) {
        return ctx.db
          .update(healthcareCompany)
          .set({
            logo: parsed.logo ?? null,
            name: parsed.name,
            slug: parsed.slug ?? null,
          })
          .where(eq(healthcareCompany.id, existing.id))
          .returning();
      }
      return ctx.db
        .insert(healthcareCompany)
        .values({
          id: crypto.randomUUID(),
          logo: parsed.logo ?? null,
          name: parsed.name,
          slug: parsed.slug ?? null,
        })
        .returning();
    });
    if (!row) {
      throw new Error("Failed to save company.");
    }
    await ctx.step.run("audit-company", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: row.id,
        entityType: "healthcare:company",
        newState: { id: row.id, name: row.name },
      });
    });
    return toCompanyDto(row);
  });
