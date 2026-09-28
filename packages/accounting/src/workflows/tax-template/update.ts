import { accountingTaxRule, accountingTaxTemplate } from "#/db-schemas/tax";
import { UpdateTaxTemplateSchema } from "#/schemas/tax";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { toMoney } from "#/utils/money";
import { assertUpdated } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ id: string(), patch: UpdateTaxTemplateSchema });

export const updateTaxTemplate = Workflow.name("accounting.tax-template.update")
  .input(InputSchema)
  .handler(async ({ id, patch }, ctx) => {
    const [existing] = await ctx.db
      .select()
      .from(accountingTaxTemplate)
      .where(eq(accountingTaxTemplate.id, id))
      .limit(1);
    if (!existing) {
      throw new Error(`Tax template "${id}" not found.`);
    }

    const [updated] = await ctx.db
      .update(accountingTaxTemplate)
      .set({
        is_sales: patch.isSales ?? existing.is_sales,
        name: patch.name ?? existing.name,
        tax_category: patch.taxCategory ?? existing.tax_category,
        updated_at: new Date(),
      })
      .where(eq(accountingTaxTemplate.id, id))
      .returning();

    const row = assertUpdated(updated, `Tax template "${id}"`);

    if (patch.rules) {
      await ctx.db.delete(accountingTaxRule).where(eq(accountingTaxRule.template_id, id));
      await ctx.db.insert(accountingTaxRule).values(
        patch.rules.map((rule, index) => ({
          account_head: rule.accountHead,
          charge_type: rule.chargeType ?? "on_net_total",
          description: rule.description ?? null,
          rate: toMoney(rule.rate),
          row_index: rule.rowIndex ?? index,
          template_id: id,
        })),
      );
    }

    await ctx.step.run("audit", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.TAX_TEMPLATE,
        newState: { name: row.name },
      });
    });

    return row;
  });
