import { healthcareService } from "#/db-schemas/services";
import { SERVICE_EVENTS } from "#/pubsub";
import { CreateServiceSchema } from "#/schemas/services";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { toServiceDto } from "#/workflow-steps/fetch-service";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const CreateServiceInputSchema = object({ input: CreateServiceSchema });

export const createService = Workflow.name("healthcare.services.create")
  .input(CreateServiceInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateServiceSchema, input);
    if (parsed.basePrice !== undefined && parsed.basePrice < 0) {
      throw new Error(`Base price (${parsed.basePrice}) cannot be negative.`);
    }
    if (parsed.durationUomId && !parsed.durationValue) {
      throw new Error("A duration unit needs a duration value (e.g. 30 min).");
    }
    if (parsed.durationValue && !parsed.durationUomId) {
      throw new Error("A duration value needs a governed Time UOM (see UOM master).");
    }
    if (parsed.billingUomId && !parsed.billingUomCategory) {
      throw new Error("A billing unit needs its UOM category (count or session).");
    }
    const { branchId } = parsed;
    const duplicate = await ctx.step.run("check-code-duplicate", async () => {
      const [existing] = await ctx.db
        .select({ id: healthcareService.id })
        .from(healthcareService)
        .where(
          and(eq(healthcareService.branch_id, branchId), eq(healthcareService.code, parsed.code)),
        )
        .limit(1);
      return existing;
    });
    if (duplicate) {
      throw new Error(
        `Service code "${parsed.code}" already exists; codes are immutable so create a new code instead.`,
      );
    }
    if (parsed.department && parsed.modality) {
      const department = parsed.department;
      const modality = parsed.modality;
      const clash = await ctx.step.run("check-name-duplicate", async () => {
        const [existing] = await ctx.db
          .select({ code: healthcareService.code, id: healthcareService.id })
          .from(healthcareService)
          .where(
            and(
              eq(healthcareService.branch_id, branchId),
              eq(healthcareService.name, parsed.name),
              eq(healthcareService.department, department),
              eq(healthcareService.modality, modality),
            ),
          )
          .limit(1);
        return existing;
      });
      if (clash) {
        throw new Error(
          `A "${parsed.name}" service already exists for ${parsed.department} / ${parsed.modality} as code "${clash.code}"; reuse or merge instead of duplicating.`,
        );
      }
    }
    const [row] = await ctx.step.run("insert-service", async () =>
      ctx.db
        .insert(healthcareService)
        .values({
          base_price: parsed.basePrice !== undefined ? String(parsed.basePrice) : null,
          billing_uom_category: parsed.billingUomCategory ?? null,
          billing_uom_id: parsed.billingUomId ?? null,
          branch_id: branchId,
          code: parsed.code,
          department: parsed.department ?? null,
          duration_uom_category: parsed.durationUomCategory ?? null,
          duration_uom_id: parsed.durationUomId ?? null,
          duration_value: parsed.durationValue !== undefined ? String(parsed.durationValue) : null,
          facility_ids: [],
          id: crypto.randomUUID(),
          modality: parsed.modality ?? null,
          name: parsed.name,
          pathy: parsed.pathy ?? null,
          status: "draft",
          tele_exempt: parsed.teleExempt ?? false,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to create service.");
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.SERVICE,
        newState: {
          branchId: row.branch_id,
          code: row.code,
          id: row.id,
          name: row.name,
        },
      });
      await ctx.pubsub.publish(SERVICE_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId: row.branch_id,
        id: row.id,
      });
    });
    return toServiceDto(row);
  });
