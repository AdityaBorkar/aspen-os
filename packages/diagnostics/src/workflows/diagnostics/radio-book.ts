import { healthcareRadioBooking } from "#/db-schemas/diagnostics";
import { DIAGNOSTICS_EVENTS } from "#/pubsub";
import { RadioBookSchema } from "#/schemas/diagnostics";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { nextHealthcareSeries } from "#/workflow-steps/series";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const RadioBookInputSchema = object({ input: RadioBookSchema });

export const radioBook = Workflow.name("diagnostics.radio-book")
  .input(RadioBookInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(RadioBookSchema, input);
    const branchId = parsed.branchId ?? "main";

    const clash = await ctx.step.run("check-slot", async () => {
      const [row] = await ctx.db
        .select({ id: healthcareRadioBooking.id, payload: healthcareRadioBooking.payload })
        .from(healthcareRadioBooking)
        .where(
          and(
            eq(healthcareRadioBooking.branch_id, branchId),
            eq(healthcareRadioBooking.service, parsed.service),
            eq(healthcareRadioBooking.slot, parsed.slot),
          ),
        )
        .limit(1);
      if (!row) {
        return null;
      }
      const rawDetail = row.payload.statusDetail;
      return rawDetail === "cancelled" ? null : row;
    });
    if (clash) {
      throw new Error(
        "Slot already booked for this machine-day; pick another slot or reschedule with override.",
      );
    }

    const bookingNo = await ctx.step.run(nextHealthcareSeries, {
      input: { series: "radio-booking" },
    });
    const created = await ctx.step.run("book-slot", async () => {
      const [row] = await ctx.db
        .insert(healthcareRadioBooking)
        .values({
          booking_no: `RAD-${String(bookingNo).padStart(6, "0")}`,
          branch_id: branchId,
          patient_id: parsed.patientId,
          payload: { mappedSlot: parsed.slot, statusDetail: "booked" },
          referred_by: parsed.referredBy ?? null,
          service: parsed.service,
          slot: parsed.slot,
          status: "booked",
        })
        .returning();
      if (!row) {
        throw new Error("Failed to book radiology slot.");
      }
      return row;
    });

    const dto = {
      bookingNo: created.booking_no,
      createdAt: created.created_at.toISOString(),
      id: created.id,
      mappedSlot: parsed.slot,
      patientId: created.patient_id,
      referredBy: created.referred_by,
      service: created.service,
      slot: created.slot,
      status: created.status,
    };
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: created.id,
        entityType: AUDIT_ENTITY_TYPE.DIAGNOSTICS,
        newState: { bookingNo: created.booking_no, id: created.id, slot: created.slot },
      });
      await ctx.pubsub.publish(DIAGNOSTICS_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId,
        id: created.id,
      });
    });
    return dto;
  });
