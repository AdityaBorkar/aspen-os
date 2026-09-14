import { healthcareQueueToken } from "#/db-schemas/appointments";
import { APPOINTMENT_EVENTS } from "#/pubsub";
import { CallNextSchema } from "#/schemas/appointments";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { toQueueTokenDto } from "#/workflow-steps/fetch-appointment";

import { Workflow } from "@aspen-os/platform/server";
import { and, asc, eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { object, parse } from "valibot";

const CallNextInputSchema = object({ input: CallNextSchema });

export const callNext = Workflow.name("healthcare.appointments.call-next")
  .input(CallNextInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CallNextSchema, input);
    const branchId = parsed.branchId ?? "main";
    const next = await ctx.step.run("peek-next", async () => {
      const conditions: SQL[] = [
        eq(healthcareQueueToken.branch_id, branchId),
        eq(healthcareQueueToken.status, "waiting"),
      ];
      if (parsed.practitionerId) {
        conditions.push(eq(healthcareQueueToken.practitioner_id, parsed.practitionerId));
      }
      const [row] = await ctx.db
        .select()
        .from(healthcareQueueToken)
        .where(and(...conditions))
        .orderBy(asc(healthcareQueueToken.token_no))
        .limit(1);
      return row ?? null;
    });
    if (!next) {
      throw new Error("Queue is empty; no waiting tokens to call.");
    }
    const [row] = await ctx.step.run("mark-called", async () =>
      ctx.db
        .update(healthcareQueueToken)
        .set({ called_at: new Date(), status: "called" })
        .where(eq(healthcareQueueToken.id, next.id))
        .returning(),
    );
    if (!row) {
      throw new Error(`Failed to call token "${next.id}".`);
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.APPOINTMENT,
        newState: { id: row.id, status: row.status },
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
