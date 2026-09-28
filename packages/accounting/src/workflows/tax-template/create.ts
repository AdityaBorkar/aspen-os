import { accountingAccount } from "#/db-schemas/chart";
import { accountingTaxRule, accountingTaxTemplate } from "#/db-schemas/tax";
import { CreateTaxTemplateSchema } from "#/schemas/tax";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { toMoney } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const InputSchema = object({ input: CreateTaxTemplateSchema });

export const createTaxTemplate = Workflow.name("accounting.tax-template.create")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateTaxTemplateSchema, input);

    await ctx.step.run("validate-accounts", async () => {
      for (const rule of parsed.rules) {
        const [account] = await ctx.db
          .select()
          .from(accountingAccount)
          .where(eq(accountingAccount.id, rule.accountHead))
          .limit(1);
        if (!account) {
          throw new Error(`Tax account "${rule.accountHead}" not found.`);
        }
        if (account.is_group) {
          throw new Error(`Tax account "${rule.accountHead}" must be a ledger, not a group.`);
        }
        if (account.is_disabled) {
          throw new Error(`Tax account "${rule.accountHead}" is disabled.`);
        }
      }
    });

    const [template] = await ctx.db
      .insert(accountingTaxTemplate)
      .values({
        is_sales: parsed.isSales ?? true,
        name: parsed.name,
        tax_category: parsed.taxCategory ?? null,
      })
      .returning();

    if (!template) {
      throw new Error("Failed to create tax template.");
    }

    await ctx.db.insert(accountingTaxRule).values(
      parsed.rules.map((rule, index) => ({
        account_head: rule.accountHead,
        charge_type: rule.chargeType ?? "on_net_total",
        description: rule.description ?? null,
        rate: toMoney(rule.rate),
        row_index: rule.rowIndex ?? index,
        template_id: template.id,
      })),
    );

    await ctx.step.run("audit", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: template.id,
        entityType: AUDIT_ENTITY_TYPE.TAX_TEMPLATE,
        newState: { name: template.name },
      });
    });

    return template;
  });
