import { healthcareResident } from "#/db-schemas/residents";
import { RESIDENT_EVENTS } from "#/pubsub";
import { RaiseAlertSchema } from "#/schemas/residents";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchResidentStep } from "#/workflow-steps/fetch-resident";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const RaiseAlertInputSchema = object({ input: RaiseAlertSchema });

export const raiseAlert = Workflow.name("healthcare.residents.raiseAlert")
  .input(RaiseAlertInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(RaiseAlertSchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";

    const resident = await ctx.step.run(fetchResidentStep, { id: parsed.residentId });
    const alert = {
      actorId,
      at: new Date().toISOString(),
      escalatedTo: ["MO", "guardian"],
      kind: parsed.kind,
      note: parsed.note,
    } satisfies Record<string, JsonValue>;
    const prior = resident.payload.alerts;
    const alerts = [...(Array.isArray(prior) ? prior : []), alert];
    await ctx.step.run("append-alert", async () => {
      await ctx.db
        .update(healthcareResident)
        .set({ payload: { ...resident.payload, alerts } })
        .where(eq(healthcareResident.id, resident.id));
    });

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.ESCALATED,
        crudAction: "create",
        entityId: resident.id,
        entityType: AUDIT_ENTITY_TYPE.RESIDENT,
        newState: { kind: parsed.kind, residentId: resident.id },
      });
      await ctx.pubsub.publish(RESIDENT_EVENTS.UPDATED, {
        actorId,
        at: new Date().toISOString(),
        branchId,
        data: {
          kind: parsed.kind,
          residentId: resident.id,
        },
        id: resident.id,
      });
      // Resident escalation rides the single delivery surface: healthcare keeps
      // the clinical alert, comms owns the out-of-band page.
      await ctx.pubsub.publish("comms.notification_created", {
        channelTypes: ["inapp"],
        notificationId: resident.id,
        recipientId: "resident-oncall",
        recipientType: "user",
        type: "resident_alert",
      });
    });

    return { escalatedTo: ["MO", "guardian"], kind: parsed.kind, residentId: resident.id };
  });
