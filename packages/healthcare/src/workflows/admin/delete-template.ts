import { healthcareTemplate } from "#/db-schemas/admin";
import { TemplateIdSchema } from "#/schemas/admin";
import { AUDIT_ACTION } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const DeleteTemplateInputSchema = object({ input: TemplateIdSchema });

export const deleteTemplate = Workflow.name("healthcare.admin.delete-template")
  .input(DeleteTemplateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(TemplateIdSchema, input);
    await ctx.step.run("fetch-template", async () => {
      const [row] = await ctx.db
        .select({ branch_id: healthcareTemplate.branch_id })
        .from(healthcareTemplate)
        .where(eq(healthcareTemplate.id, parsed.id))
        .limit(1);
      if (!row) {
        throw new Error(`Template "${parsed.id}" not found.`);
      }
      return row;
    });
    const [row] = await ctx.step.run("delete-template", async () =>
      ctx.db
        .update(healthcareTemplate)
        .set({ status: "deleted" })
        .where(eq(healthcareTemplate.id, parsed.id))
        .returning(),
    );
    if (!row) {
      throw new Error(`Failed to delete template "${parsed.id}".`);
    }
    await ctx.step.run("audit-template", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.DELETED,
        crudAction: "delete",
        entityId: row.id,
        entityType: "healthcare:template",
        newState: { id: row.id, status: row.status },
      });
    });
    return { id: row.id, status: row.status };
  });
