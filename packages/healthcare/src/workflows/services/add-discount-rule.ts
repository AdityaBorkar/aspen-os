import { healthcareDiscountRule } from "#/db-schemas/services";
import { SERVICE_EVENTS } from "#/pubsub";
import { CreateDiscountRuleSchema } from "#/schemas/services";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { toDiscountRuleDto } from "#/workflow-steps/fetch-service";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const AddDiscountRuleInputSchema = object({ input: CreateDiscountRuleSchema });

export const addDiscountRule = Workflow.name("healthcare.services.add-discount-rule")
  .input(AddDiscountRuleInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateDiscountRuleSchema, input);
    if (parsed.pct < 0 || parsed.pct > 100) {
      throw new Error(`Discount percent (${parsed.pct}) must be between 0 and 100.`);
    }
    if (parsed.minQty !== undefined && parsed.minQty < 0) {
      throw new Error(`Minimum quantity (${parsed.minQty}) cannot be negative.`);
    }
    const [row] = await ctx.step.run("insert-discount-rule", async () =>
      ctx.db
        .insert(healthcareDiscountRule)
        .values({
          branch_id: parsed.branchId,
          code: parsed.code ?? null,
          id: crypto.randomUUID(),
          min_qty: parsed.minQty ?? null,
          pct: String(parsed.pct),
          service_id: parsed.serviceId ?? null,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to save discount rule.");
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.SERVICE,
        newState: {
          id: row.id,
          pct: row.pct,
          serviceId: row.service_id,
        },
      });
      await ctx.pubsub.publish(SERVICE_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId: row.branch_id,
        id: row.service_id ?? row.id,
      });
    });
    return toDiscountRuleDto(row);
  });
