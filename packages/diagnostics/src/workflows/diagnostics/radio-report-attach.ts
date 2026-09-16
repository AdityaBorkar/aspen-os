import { healthcareRadioBooking, healthcareRadioReport } from "#/db-schemas/diagnostics";
import { DIAGNOSTICS_EVENTS } from "#/pubsub";
import { RadioReportAttachSchema } from "#/schemas/diagnostics";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchRadioBookingStep } from "#/workflow-steps/fetch-diagnostics";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { is, object, parse, string } from "valibot";

const RadioReportAttachInputSchema = object({ input: RadioReportAttachSchema });

export const radioReportAttach = Workflow.name("diagnostics.radio-report-attach")
  .input(RadioReportAttachInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(RadioReportAttachSchema, input);
    const branchId = parsed.branchId ?? "main";

    const booking = await ctx.step.run(fetchRadioBookingStep, { id: parsed.bookingId });
    if (booking.branch_id !== branchId) {
      throw new Error("Booking belongs to a different branch; verify the booking and retry.");
    }
    const rawDetail = booking.payload.statusDetail;
    const detail = is(string(), rawDetail) ? rawDetail : "booked";
    if (detail === "cancelled") {
      throw new Error("Booking is cancelled; reports cannot be attached to it.");
    }

    const version = await ctx.step.run("next-version", async () => {
      const rows = await ctx.db
        .select({ version: healthcareRadioReport.version })
        .from(healthcareRadioReport)
        .where(
          and(
            eq(healthcareRadioReport.branch_id, branchId),
            eq(healthcareRadioReport.booking_id, parsed.bookingId),
          ),
        );
      return rows.reduce((max, row) => Math.max(max, row.version), 0) + 1;
    });

    await ctx.step.run("attach-report", async () => {
      await ctx.db.insert(healthcareRadioReport).values({
        booking_id: parsed.bookingId,
        branch_id: branchId,
        dms_file_id: parsed.dmsFileId,
        impression: parsed.impression ?? null,
        status: "draft",
        version,
      });
      await ctx.db
        .update(healthcareRadioBooking)
        .set({
          payload: { ...booking.payload, reportVersion: version, statusDetail: "reported" },
          status: "reported",
        })
        .where(eq(healthcareRadioBooking.id, booking.id));
    });

    const dto = {
      bookingId: booking.id,
      dmsFileId: parsed.dmsFileId,
      missingImpression: !parsed.impression,
      status: "reported" as const,
      version,
    };
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: booking.id,
        entityType: AUDIT_ENTITY_TYPE.DIAGNOSTICS,
        newState: { bookingId: booking.id, dmsFileId: dto.dmsFileId, version },
      });
      await ctx.pubsub.publish(DIAGNOSTICS_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId,
        data: {
          bookingId: booking.id,
          dmsFileId: dto.dmsFileId,
        },
        id: booking.id,
      });
    });
    return dto;
  });
