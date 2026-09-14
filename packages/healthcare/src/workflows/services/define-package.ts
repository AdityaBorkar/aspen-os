import { healthcarePackageDef } from "#/db-schemas/services";
import { SERVICE_EVENTS } from "#/pubsub";
import { DefinePackageSchema } from "#/schemas/services";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { toPackageDefDto } from "#/workflow-steps/fetch-service";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const DefinePackageInputSchema = object({ input: DefinePackageSchema });

export const definePackage = Workflow.name("healthcare.services.define-package")
  .input(DefinePackageInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(DefinePackageSchema, input);
    if (parsed.price < 0) {
      throw new Error(`Package price (${parsed.price}) cannot be negative.`);
    }
    if (parsed.serviceIds.length === 0) {
      throw new Error("Package must include at least one service.");
    }
    const [row] = await ctx.step.run("insert-package", async () =>
      ctx.db
        .insert(healthcarePackageDef)
        .values({
          branch_id: parsed.branchId,
          id: crypto.randomUUID(),
          name: parsed.name,
          payload: { redeemedCount: 0, redemptions: [], totalRedemptions: 1 },
          price: String(parsed.price),
          service_ids: parsed.serviceIds,
          status: "published",
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to save package.");
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.SERVICE,
        newState: {
          id: row.id,
          name: row.name,
          price: row.price,
          serviceIds: row.service_ids,
        },
      });
      await ctx.pubsub.publish(SERVICE_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId: row.branch_id,
        id: row.id,
      });
    });
    return toPackageDefDto(row);
  });
