import { healthcareRadioBooking, healthcareRadioReport } from "#/db-schemas/diagnostics";
import { DIAGNOSTICS_EVENTS } from "#/pubsub";
import { RadioAuthorizeSchema } from "#/schemas/diagnostics";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchRadioBookingStep } from "#/workflow-steps/fetch-diagnostics";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { is, number, object, parse, string } from "valibot";

const RadioAuthorizeInputSchema = object({ input: RadioAuthorizeSchema });

export const radioAuthorize = Workflow.name("healthcare.diagnostics.radio-authorize")
  .input(RadioAuthorizeInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(RadioAuthorizeSchema, input);
    const branchId = parsed.branchId ?? "main";

    const booking = await ctx.step.run(fetchRadioBookingStep, { id: parsed.bookingId });
    if (booking.branch_id !== branchId) {
      throw new Error("Booking belongs to a different branch; verify the booking and retry.");
    }
    const rawDetail = booking.payload.statusDetail;
    const detail = is(string(), rawDetail) ? rawDetail : "booked";
    if (detail === "cancelled") {
      throw new Error("Booking is cancelled; it cannot be authorized.");
    }

    const reports = await ctx.step.run("fetch-reports", async () =>
      ctx.db
        .select()
        .from(healthcareRadioReport)
        .where(
          and(
            eq(healthcareRadioReport.branch_id, branchId),
            eq(healthcareRadioReport.booking_id, parsed.bookingId),
          ),
        ),
    );
    if (reports.length === 0) {
      throw new Error("No report attached yet; attach the report before authorizing.");
    }
    const sorted = reports.toSorted((left, right) => left.version - right.version);
    const target = parsed.version
      ? (sorted.find((report) => report.version === parsed.version) ?? null)
      : (sorted[sorted.length - 1] ?? null);
    if (!target) {
      throw new Error(`Report version ${parsed.version} not found for this booking.`);
    }
    if (!target.impression) {
      throw new Error("Report impression is missing; add the impression before authorizing.");
    }

    const rawAuthorizedVersion = booking.payload.authorizedVersion;
    const authorizedVersion = is(number(), rawAuthorizedVersion) ? rawAuthorizedVersion : 0;
    const isResign = authorizedVersion > 0 && target.version > authorizedVersion;
    let resignDiff: { dmsFileChanged: boolean; impressionChanged: boolean } | null = null;
    if (isResign) {
      const prior = sorted.find((report) => report.version === authorizedVersion) ?? null;
      resignDiff = {
        dmsFileChanged: prior ? prior.dms_file_id !== target.dms_file_id : true,
        impressionChanged: prior ? prior.impression !== target.impression : true,
      };
    }

    await ctx.step.run("authorize-report", async () => {
      await ctx.db
        .update(healthcareRadioReport)
        .set({ authorized_by: parsed.authorizedBy, status: "authorized" })
        .where(eq(healthcareRadioReport.id, target.id));
      await ctx.db
        .update(healthcareRadioBooking)
        .set({
          payload: {
            ...booking.payload,
            authorizedAt: new Date().toISOString(),
            authorizedBy: parsed.authorizedBy,
            authorizedVersion: target.version,
            resignDiff,
            statusDetail: "authorized",
          },
          status: "authorized",
        })
        .where(eq(healthcareRadioBooking.id, booking.id));
    });

    const dto = {
      bookingId: booking.id,
      resign: isResign,
      resignDiff,
      status: "authorized" as const,
      version: target.version,
    };
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.AUTHORIZED,
        crudAction: "update",
        entityId: booking.id,
        entityType: AUDIT_ENTITY_TYPE.DIAGNOSTICS,
        newState: {
          authorizedBy: parsed.authorizedBy,
          bookingId: booking.id,
          resign: isResign,
          version: target.version,
        },
      });
      await ctx.pubsub.publish(DIAGNOSTICS_EVENTS.AUTHORIZED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId,
        id: booking.id,
      });
    });
    return dto;
  });
