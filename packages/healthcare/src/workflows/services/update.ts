import { healthcareService } from "#/db-schemas/services";
import { SERVICE_EVENTS } from "#/pubsub";
import { UpdateServiceSchema } from "#/schemas/services";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchServiceStep, toServiceDto } from "#/workflow-steps/fetch-service";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const UpdateServiceInputSchema = object({ input: UpdateServiceSchema });

export const updateService = Workflow.name("healthcare.services.update")
  .input(UpdateServiceInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(UpdateServiceSchema, input);
    const existing = await ctx.step.run(fetchServiceStep, { id: parsed.id });
    if (parsed.patch.basePrice !== undefined && parsed.patch.basePrice < 0) {
      throw new Error(`Base price (${parsed.patch.basePrice}) cannot be negative.`);
    }
    const durationUomId = parsed.patch.durationUomId ?? existing.duration_uom_id ?? undefined;
    const durationValue =
      parsed.patch.durationValue ??
      (existing.duration_value === null ? undefined : Number(existing.duration_value));
    if (durationUomId && !durationValue) {
      throw new Error("A duration unit needs a duration value (e.g. 30 min).");
    }
    if (parsed.patch.durationValue !== undefined && !durationUomId) {
      throw new Error("A duration value needs a governed Time UOM (see UOM master).");
    }
    if (
      parsed.patch.billingUomId &&
      !parsed.patch.billingUomCategory &&
      !existing.billing_uom_category
    ) {
      throw new Error("A billing unit needs its UOM category (count or session).");
    }
    const [row] = await ctx.step.run("update-service", async () =>
      ctx.db
        .update(healthcareService)
        .set({
          base_price:
            parsed.patch.basePrice !== undefined
              ? String(parsed.patch.basePrice)
              : existing.base_price,
          billing_uom_category: parsed.patch.billingUomCategory ?? existing.billing_uom_category,
          billing_uom_id: parsed.patch.billingUomId ?? existing.billing_uom_id,
          department: parsed.patch.department ?? existing.department,
          duration_uom_category: parsed.patch.durationUomCategory ?? existing.duration_uom_category,
          duration_uom_id: parsed.patch.durationUomId ?? existing.duration_uom_id,
          duration_value:
            parsed.patch.durationValue !== undefined
              ? String(parsed.patch.durationValue)
              : existing.duration_value,
          modality: parsed.patch.modality ?? existing.modality,
          name: parsed.patch.name ?? existing.name,
          pathy: parsed.patch.pathy ?? existing.pathy,
          tele_exempt: parsed.patch.teleExempt ?? existing.tele_exempt,
          updated_at: new Date(),
        })
        .where(eq(healthcareService.id, parsed.id))
        .returning(),
    );
    if (!row) {
      throw new Error(`Failed to update service "${parsed.id}".`);
    }
    await ctx.step.run("audit-and-notify", async () => {
      const changes: Record<string, JsonValue> = {};
      for (const [key, value] of Object.entries(parsed.patch)) {
        if (value !== undefined) {
          // SAFETY: patch values are validated primitives, JSON-safe by construction.
          changes[key] = value;
        }
      }
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        changes,
        crudAction: "update",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.SERVICE,
      });
      await ctx.pubsub.publish(SERVICE_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId: row.branch_id,
        id: row.id,
      });
    });
    return toServiceDto(row);
  });
