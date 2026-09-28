import { accountingJournalTemplate } from "#/db-schemas/settings";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { minLength, nullable, number, object, optional, parse, pipe, string, array } from "valibot";

const TemplateLineSchema = object({
  accountId: pipe(string(), minLength(1, "accountId is required")),
  credit: optional(number(), 0),
  debit: optional(number(), 0),
});

const CreateInputSchema = object({
  entryType: optional(nullable(string()), "journal"),
  lines: pipe(array(TemplateLineSchema), minLength(2, "At least two lines are required")),
  name: pipe(string(), minLength(1, "name is required")),
  narration: optional(nullable(string())),
});

export const createJournalTemplate = Workflow.name("accounting.journal-template.create")
  .input(CreateInputSchema)
  .handler(async (input, ctx) => {
    const parsed = parse(CreateInputSchema, input);
    const [row] = await ctx.db
      .insert(accountingJournalTemplate)
      .values({
        entry_type: parsed.entryType ?? "journal",
        lines: parsed.lines.map((line) => ({
          accountId: line.accountId,
          credit: line.credit ?? 0,
          debit: line.debit ?? 0,
        })),
        name: parsed.name,
        narration: parsed.narration ?? null,
      })
      .returning();
    if (!row) {
      throw new Error("Failed to create journal template.");
    }
    await ctx.step.run("audit", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.JOURNAL,
        newState: { name: row.name },
      });
    });
    return row;
  });
