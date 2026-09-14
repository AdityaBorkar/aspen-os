import { healthcareRadioBooking } from "#/db-schemas/diagnostics";
import { DIAGNOSTICS_EVENTS } from "#/pubsub";
import { RadioCheckinSchema } from "#/schemas/diagnostics";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchRadioBookingStep } from "#/workflow-steps/fetch-diagnostics";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { is, object, parse, string } from "valibot";

const RadioCheckinInputSchema = object({ input: RadioCheckinSchema });

export const radioCheckin = Workflow.name("healthcare.diagnostics.radio-checkin")
  .input(RadioCheckinInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(RadioCheckinSchema, input);
    const branchId = parsed.branchId ?? "main";

    const booking = await ctx.step.run(fetchRadioBookingStep, { id: parsed.bookingId });
    if (booking.branch_id !== branchId) {
      throw new Error("Booking belongs to a different branch; verify the booking and retry.");
    }
    const rawDetail = booking.payload.statusDetail;
    const detail = is(string(), rawDetail) ? rawDetail : "booked";
    if (detail === "cancelled") {
      throw new Error("Booking is cancelled; check-in is not possible.");
    }

    await ctx.step.run("checkin", async () => {
      await ctx.db
        .update(healthcareRadioBooking)
        .set({
          payload: {
            ...booking.payload,
            checkedInAt: new Date().toISOString(),
            statusDetail: "checked-in",
          },
          status: "checked-in",
        })
        .where(eq(healthcareRadioBooking.id, booking.id));
    });

    const dto = { bookingId: booking.id, status: "checked-in" as const };
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: booking.id,
        entityType: AUDIT_ENTITY_TYPE.DIAGNOSTICS,
        newState: { bookingId: booking.id, status: "checked-in" },
      });
      await ctx.pubsub.publish(DIAGNOSTICS_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId,
        id: booking.id,
      });
    });
    return dto;
  });
