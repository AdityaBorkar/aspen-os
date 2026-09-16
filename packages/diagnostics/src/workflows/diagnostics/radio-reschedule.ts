import { healthcareRadioBooking } from "#/db-schemas/diagnostics";
import { DIAGNOSTICS_EVENTS } from "#/pubsub";
import { RadioRescheduleSchema } from "#/schemas/diagnostics";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchRadioBookingStep } from "#/workflow-steps/fetch-diagnostics";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { and, eq, ne } from "drizzle-orm";
import { is, object, parse, string } from "valibot";

const RadioRescheduleInputSchema = object({ input: RadioRescheduleSchema });

interface RescheduleEntry {
  [key: string]: string | null;
  at: string;
  from: string;
  reason: string | null;
  supervisorOverrideBy: string | null;
  to: string;
}

const RescheduleEntrySchema = object({ at: string(), from: string(), to: string() });

function isRescheduleEntry(value: JsonValue): value is RescheduleEntry {
  if (value instanceof Date || Array.isArray(value)) {
    return false;
  }
  return is(RescheduleEntrySchema, value);
}

export const radioReschedule = Workflow.name("diagnostics.radio-reschedule")
  .input(RadioRescheduleInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(RadioRescheduleSchema, input);
    const branchId = parsed.branchId ?? "main";

    const booking = await ctx.step.run(fetchRadioBookingStep, { id: parsed.bookingId });
    if (booking.branch_id !== branchId) {
      throw new Error("Booking belongs to a different branch; verify the booking and retry.");
    }
    const rawDetail = booking.payload.statusDetail;
    const detail = is(string(), rawDetail) ? rawDetail : "booked";
    if (detail === "cancelled") {
      throw new Error("Booking is cancelled; it cannot be rescheduled.");
    }

    const clash = await ctx.step.run("check-target-slot", async () => {
      const [row] = await ctx.db
        .select({ id: healthcareRadioBooking.id, payload: healthcareRadioBooking.payload })
        .from(healthcareRadioBooking)
        .where(
          and(
            eq(healthcareRadioBooking.branch_id, branchId),
            eq(healthcareRadioBooking.service, booking.service),
            eq(healthcareRadioBooking.slot, parsed.newSlot),
            ne(healthcareRadioBooking.id, booking.id),
          ),
        )
        .limit(1);
      if (!row) {
        return null;
      }
      const targetDetail = row.payload.statusDetail;
      return targetDetail === "cancelled" ? null : row;
    });
    if (clash && !parsed.supervisorOverrideBy) {
      throw new Error(
        "Target slot is taken; choose a free slot or add supervisorOverrideBy with reason.",
      );
    }
    if (parsed.supervisorOverrideBy && !parsed.reason) {
      throw new Error(
        "Supervisor override requires a reason; record why the clash was overridden.",
      );
    }

    await ctx.step.run("reschedule", async () => {
      const rawHistory = booking.payload.rescheduleHistory;
      const history: RescheduleEntry[] = Array.isArray(rawHistory)
        ? rawHistory.filter(isRescheduleEntry)
        : [];
      const entry: RescheduleEntry = {
        at: new Date().toISOString(),
        from: booking.slot,
        reason: parsed.reason ?? null,
        supervisorOverrideBy: parsed.supervisorOverrideBy ?? null,
        to: parsed.newSlot,
      };
      await ctx.db
        .update(healthcareRadioBooking)
        .set({
          payload: {
            ...booking.payload,
            mappedSlot: parsed.newSlot,
            rescheduleHistory: [...history, entry],
            statusDetail: "rescheduled",
            supervisorOverrideBy: parsed.supervisorOverrideBy ?? null,
          },
          slot: parsed.newSlot,
          status: "booked",
        })
        .where(eq(healthcareRadioBooking.id, booking.id));
    });

    const dto = {
      bookingId: booking.id,
      overridden: Boolean(parsed.supervisorOverrideBy),
      slot: parsed.newSlot,
    };
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: parsed.supervisorOverrideBy ? AUDIT_ACTION.OVERRIDE : AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: booking.id,
        entityType: AUDIT_ENTITY_TYPE.DIAGNOSTICS,
        newState: {
          bookingId: booking.id,
          reason: parsed.reason ?? null,
          slot: parsed.newSlot,
          supervisorOverrideBy: parsed.supervisorOverrideBy ?? null,
        },
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
