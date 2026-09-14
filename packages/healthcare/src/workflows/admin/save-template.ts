import { healthcareTemplate } from "#/db-schemas/admin";
import { SaveTemplateSchema } from "#/schemas/admin";
import { AUDIT_ACTION } from "#/utils/constants";
import { toTemplateDto } from "#/workflow-steps/fetch-admin";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const SaveTemplateInputSchema = object({ input: SaveTemplateSchema });

export const saveTemplate = Workflow.name("healthcare.admin.save-template")
  .input(SaveTemplateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(SaveTemplateSchema, input);
    const branchId = parsed.branchId ?? "main";
    const [row] = await ctx.step.run("insert-template", async () =>
      ctx.db
        .insert(healthcareTemplate)
        .values({
          body: parsed.body,
          branch_id: branchId,
          id: crypto.randomUUID(),
          kind: parsed.kind,
          name: parsed.name,
          status: "active",
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to save template.");
    }
    await ctx.step.run("audit-template", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: "healthcare:template",
        newState: { id: row.id, kind: row.kind, name: row.name },
      });
    });
    return toTemplateDto(row);
  });
