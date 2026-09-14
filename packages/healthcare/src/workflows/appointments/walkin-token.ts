import { healthcareQueueToken } from "#/db-schemas/appointments";
import { APPOINTMENT_EVENTS } from "#/pubsub";
import { WalkinTokenSchema } from "#/schemas/appointments";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { toQueueTokenDto } from "#/workflow-steps/fetch-appointment";

import { Workflow } from "@aspen-os/platform/server";
import { desc, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const WalkinInputSchema = object({ input: WalkinTokenSchema });

export const walkinToken = Workflow.name("healthcare.appointments.walkin-token")
  .input(WalkinInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(WalkinTokenSchema, input);
    const branchId = parsed.branchId ?? "main";
    // Walk-ins are always appended after the current max token number and
    // existing tokens are never renumbered, so a walk-in can never displace
    // a booked appointment in the queue order.
    const nextNo = await ctx.step.run("next-token-no", async () => {
      const [latest] = await ctx.db
        .select({ token_no: healthcareQueueToken.token_no })
        .from(healthcareQueueToken)
        .where(eq(healthcareQueueToken.branch_id, branchId))
        .orderBy(desc(healthcareQueueToken.token_no))
        .limit(1);
      return (latest?.token_no ?? 0) + 1;
    });
    const [row] = await ctx.step.run("insert-token", async () =>
      ctx.db
        .insert(healthcareQueueToken)
        .values({
          branch_id: branchId,
          facility_id: parsed.facilityId ?? null,
          id: crypto.randomUUID(),
          patient_id: parsed.patientId ?? null,
          practitioner_id: parsed.practitionerId ?? null,
          status: "waiting",
          token_no: nextNo,
          walkin: parsed.walkin ?? false,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to issue walk-in token.");
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.APPOINTMENT,
        newState: { id: row.id, tokenNo: row.token_no },
      });
      await ctx.pubsub.publish(APPOINTMENT_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId,
        id: row.id,
      });
    });
    return toQueueTokenDto(row);
  });
