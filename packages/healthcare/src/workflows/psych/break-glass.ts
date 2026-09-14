import { healthcareBreakGlassLog } from "#/db-schemas/psych";
import { CreateBreakGlassSchema } from "#/schemas/psych";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const BreakGlassInputSchema = object({ input: CreateBreakGlassSchema });

export const breakGlass = Workflow.name("healthcare.psych.breakGlass")
  .input(BreakGlassInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateBreakGlassSchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";

    const [row] = await ctx.step.run("insert-break-glass-log", async () =>
      ctx.db
        .insert(healthcareBreakGlassLog)
        .values({
          actor_id: actorId,
          branch_id: branchId,
          created_by: actorId,
          patient_id: parsed.patientId,
          reason: parsed.reason,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to record the break-glass access.");
    }

    // Break-glass is audit-only by design: no clinical content is published.
    await ctx.step.run("audit-break-glass", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.BREAKGLASS,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.PSYCH,
        newState: {
          actorId: row.actor_id,
          id: row.id,
          patientId: row.patient_id,
          reason: row.reason,
        },
      });
    });

    return {
      actorId: row.actor_id,
      branchId: row.branch_id,
      createdAt: row.created_at.toISOString(),
      id: row.id,
      patientId: row.patient_id,
    };
  });
