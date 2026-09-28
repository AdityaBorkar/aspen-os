import { accountingPaymentTermTemplate } from "#/db-schemas/tax";
import { CreatePaymentTermTemplateSchema } from "#/schemas/tax";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const InputSchema = object({ input: CreatePaymentTermTemplateSchema });

export const createPaymentTermTemplate = Workflow.name("accounting.payment-term.create")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreatePaymentTermTemplateSchema, input);
    let total = 0;
    for (const line of parsed.schedule) {
      total += line.percent;
    }
    if (Math.abs(total - 100) > 0.01) {
      throw new Error("Payment term schedule percentages must total 100.");
    }

    const [row] = await ctx.db
      .insert(accountingPaymentTermTemplate)
      .values({ name: parsed.name, schedule: parsed.schedule })
      .returning();

    if (!row) {
      throw new Error("Failed to create payment term template.");
    }

    await ctx.step.run("audit", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.PAYMENT_TERM_TEMPLATE,
        newState: { name: row.name },
      });
    });

    return row;
  });
