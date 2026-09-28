import { accountingTermsTemplate } from "#/db-schemas/settings";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { minLength, object, parse, pipe, string } from "valibot";

const InputSchema = object({
  content: pipe(string(), minLength(1, "content is required")),
  name: pipe(string(), minLength(1, "name is required")),
});

export const createTermsTemplate = Workflow.name("accounting.terms.create")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const parsed = parse(InputSchema, input);
    const [row] = await ctx.db
      .insert(accountingTermsTemplate)
      .values({ content: parsed.content, name: parsed.name })
      .returning();
    if (!row) {
      throw new Error("Failed to create terms template.");
    }
    await ctx.step.run("audit", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.TERMS_TEMPLATE,
        newState: { name: row.name },
      });
    });
    return row;
  });
