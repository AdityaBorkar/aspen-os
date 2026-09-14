import { healthcareFacility } from "#/db-schemas/facilities";
import { FACILITY_EVENTS } from "#/pubsub";
import { UpdateFacilitySchema } from "#/schemas/facilities";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchFacilityStep, toFacilityDto } from "#/workflow-steps/fetch-facility";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { and, eq, ne } from "drizzle-orm";
import { object, parse } from "valibot";

const UpdateFacilityInputSchema = object({ input: UpdateFacilitySchema });

export const updateFacility = Workflow.name("healthcare.facilities.update")
  .input(UpdateFacilityInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(UpdateFacilitySchema, input);
    const existing = await ctx.step.run(fetchFacilityStep, { id: parsed.id });
    if (parsed.patch.code !== undefined && parsed.patch.code !== existing.code) {
      const duplicate = await ctx.step.run("check-code-duplicate", async () => {
        const [row] = await ctx.db
          .select({ id: healthcareFacility.id })
          .from(healthcareFacility)
          .where(
            and(
              eq(healthcareFacility.branch_id, existing.branch_id),
              eq(healthcareFacility.code, parsed.patch.code ?? ""),
              ne(healthcareFacility.id, parsed.id),
            ),
          )
          .limit(1);
        return row;
      });
      if (duplicate) {
        throw new Error(
          `Facility code "${parsed.patch.code}" already exists in this branch; codes must be unique.`,
        );
      }
    }
    const [row] = await ctx.step.run("update-facility", async () =>
      ctx.db
        .update(healthcareFacility)
        .set({
          category: parsed.patch.category ?? existing.category,
          code: parsed.patch.code ?? existing.code,
          name: parsed.patch.name ?? existing.name,
          updated_at: new Date(),
        })
        .where(eq(healthcareFacility.id, parsed.id))
        .returning(),
    );
    if (!row) {
      throw new Error(`Failed to update facility "${parsed.id}".`);
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
        entityType: AUDIT_ENTITY_TYPE.FACILITY,
      });
      await ctx.pubsub.publish(FACILITY_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId: row.branch_id,
        id: row.id,
      });
    });
    return toFacilityDto(row);
  });
