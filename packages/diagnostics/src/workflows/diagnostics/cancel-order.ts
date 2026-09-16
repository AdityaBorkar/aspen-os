import { healthcareLabOrder, healthcareRadioBooking } from "#/db-schemas/diagnostics";
import { DIAGNOSTICS_EVENTS } from "#/pubsub";
import { CancelOrderSchema } from "#/schemas/diagnostics";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchLabOrderStep, fetchRadioBookingStep } from "#/workflow-steps/fetch-diagnostics";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const CancelOrderInputSchema = object({ input: CancelOrderSchema });

export const cancelOrder = Workflow.name("diagnostics.cancel-order")
  .input(CancelOrderInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CancelOrderSchema, input);
    const branchId = parsed.branchId ?? "main";

    if (!parsed.orderId && !parsed.bookingId) {
      throw new Error("Nothing to cancel; provide orderId or bookingId and retry.");
    }

    if (parsed.orderId) {
      const order = await ctx.step.run(fetchLabOrderStep, { id: parsed.orderId });
      if (order.branch_id !== branchId) {
        throw new Error("Lab order belongs to a different branch; verify the order and retry.");
      }
      const billed = order.is_billed || order.status === "paid";
      await ctx.step.run("cancel-lab-order", async () => {
        await ctx.db
          .update(healthcareLabOrder)
          .set({
            payload: {
              ...order.payload,
              cancelReason: parsed.reason,
              cancelledAt: new Date().toISOString(),
              cancelledBy: parsed.cancelledBy,
              statusDetail: "cancelled",
            },
          })
          .where(eq(healthcareLabOrder.id, order.id));
      });
      const dto = billed
        ? {
            creditNoteHandoff: {
              handoffTo: "billing" as const,
              orderId: order.id,
              reason: `Billed order cancelled: ${parsed.reason}`,
            },
            orderId: order.id,
            status: "cancelled" as const,
          }
        : { orderId: order.id, status: "cancelled" as const };
      await ctx.step.run("audit-and-notify", async () => {
        await ctx.audit.write({
          action: AUDIT_ACTION.UPDATED,
          crudAction: "update",
          entityId: order.id,
          entityType: AUDIT_ENTITY_TYPE.DIAGNOSTICS,
          newState: { billed, orderId: order.id, reason: parsed.reason, status: "cancelled" },
        });
        await ctx.pubsub.publish(DIAGNOSTICS_EVENTS.UPDATED, {
          actorId: ctx.actorId,
          at: new Date().toISOString(),
          branchId,
          id: order.id,
        });
      });
      return dto;
    }

    const bookingId = parsed.bookingId ?? "";
    const booking = await ctx.step.run(fetchRadioBookingStep, { id: bookingId });
    if (booking.branch_id !== branchId) {
      throw new Error("Booking belongs to a different branch; verify the booking and retry.");
    }
    await ctx.step.run("cancel-radio-booking", async () => {
      await ctx.db
        .update(healthcareRadioBooking)
        .set({
          payload: {
            ...booking.payload,
            cancelReason: parsed.reason,
            cancelledAt: new Date().toISOString(),
            cancelledBy: parsed.cancelledBy,
            statusDetail: "cancelled",
          },
        })
        .where(eq(healthcareRadioBooking.id, booking.id));
    });
    const dto = { bookingId: booking.id, status: "cancelled" as const };
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: booking.id,
        entityType: AUDIT_ENTITY_TYPE.DIAGNOSTICS,
        newState: { bookingId: booking.id, reason: parsed.reason, status: "cancelled" },
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
