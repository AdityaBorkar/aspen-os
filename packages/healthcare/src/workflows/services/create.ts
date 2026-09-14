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
    const [row] = await ctx.step.run("insert-service", async () =>
      ctx.db
        .insert(healthcareService)
        .values({
          base_price: parsed.basePrice !== undefined ? String(parsed.basePrice) : null,
          branch_id: branchId,
          code: parsed.code,
          facility_ids: [],
          id: crypto.randomUUID(),
          name: parsed.name,
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
