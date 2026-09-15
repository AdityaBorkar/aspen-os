import { healthcareServicePrice } from "#/db-schemas/services";
import { SERVICE_EVENTS } from "#/pubsub";
import { SetPriceSchema } from "#/schemas/services";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import {
  fetchPricelistStep,
  fetchServiceStep,
  toServicePriceDto,
} from "#/workflow-steps/fetch-service";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const SetPriceInputSchema = object({ input: SetPriceSchema });

export const setServicePrice = Workflow.name("healthcare.services.set-price")
  .input(SetPriceInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(SetPriceSchema, input);
    if (parsed.amount < 0) {
      throw new Error(`Price amount (${parsed.amount}) cannot be negative.`);
    }
    if (parsed.gstPct !== undefined && parsed.gstPct < 0) {
      throw new Error(`GST percent (${parsed.gstPct}) cannot be negative.`);
    }
    const today = new Date().toISOString().slice(0, 10);
    const effectiveFrom = parsed.effectiveFrom ?? today;
    if (effectiveFrom < today) {
      throw new Error(
        `Price effective date (${effectiveFrom}) must be today or later; prices are prospective only.`,
      );
    }
    const service = await ctx.step.run(fetchServiceStep, {
      id: parsed.serviceId,
    });
    const pricelist = parsed.pricelistId
      ? await ctx.step.run(fetchPricelistStep, { id: parsed.pricelistId })
      : null;
    const [row] = await ctx.step.run("insert-price", async () =>
      ctx.db
        .insert(healthcareServicePrice)
        .values({
          amount: String(parsed.amount),
          branch_id: parsed.branchId,
          effective_from: effectiveFrom,
          gst_pct: parsed.gstPct !== undefined ? String(parsed.gstPct) : null,
          id: crypto.randomUUID(),
          pricelist: pricelist ? pricelist.code : (parsed.pricelist ?? "standard"),
          pricelist_id: pricelist ? pricelist.id : null,
          service_id: parsed.serviceId,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to save price.");
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.SERVICE,
        newState: {
          amount: row.amount,
          effectiveFrom: row.effective_from,
          id: row.id,
          serviceId: row.service_id,
        },
      });
      await ctx.pubsub.publish(SERVICE_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId: service.branch_id,
        id: parsed.serviceId,
      });
    });
    return toServicePriceDto(row);
  });
