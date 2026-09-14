import { healthcarePractitioner } from "#/db-schemas/practitioners";
import { PRACTITIONER_EVENTS } from "#/pubsub";
import { UpdatePractitionerSchema } from "#/schemas/practitioners";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchPractitionerStep, toPractitionerDto } from "#/workflow-steps/fetch-practitioner";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const UpdatePractitionerInputSchema = object({ input: UpdatePractitionerSchema });

export const updatePractitioner = Workflow.name("healthcare.practitioners.update")
  .input(UpdatePractitionerInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(UpdatePractitionerSchema, input);
    const existing = await ctx.step.run(fetchPractitionerStep, { id: parsed.id });
    const overallYrs = parsed.patch.overallYrs ?? existing.overall_yrs ?? undefined;
    const specialistYrs = parsed.patch.specialistYrs ?? existing.specialist_yrs ?? undefined;
    if (specialistYrs !== undefined && overallYrs !== undefined && specialistYrs > overallYrs) {
      throw new Error(
        `Specialist years (${specialistYrs}) cannot exceed overall years (${overallYrs}).`,
      );
    }
    const [row] = await ctx.step.run("update-practitioner", async () =>
      ctx.db
        .update(healthcarePractitioner)
        .set({
          email: parsed.patch.email ?? existing.email,
          languages: parsed.patch.languages ?? existing.languages,
          name: parsed.patch.name ?? existing.name,
          overall_yrs: parsed.patch.overallYrs ?? existing.overall_yrs,
          phone: parsed.patch.phone ?? existing.phone,
          specialist_yrs: parsed.patch.specialistYrs ?? existing.specialist_yrs,
          specialty: parsed.patch.specialty ?? existing.specialty,
          updated_at: new Date(),
        })
        .where(eq(healthcarePractitioner.id, parsed.id))
        .returning(),
    );
    if (!row) {
      throw new Error(`Failed to update practitioner "${parsed.id}".`);
    }
    await ctx.step.run("audit-and-notify", async () => {
      const changes: Record<string, JsonValue> = {};
      for (const [key, value] of Object.entries(parsed.patch)) {
        if (value !== undefined) {
          // SAFETY: patch values are validated primitives/arrays, JSON-safe by construction.
          changes[key] = value;
        }
      }
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        changes,
        crudAction: "update",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.PRACTITIONER,
      });
      await ctx.pubsub.publish(PRACTITIONER_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId: row.branch_id,
        id: row.id,
      });
    });
    return toPractitionerDto(row);
  });
