import { healthcareLabOrder } from "#/db-schemas/diagnostics";
import { DIAGNOSTICS_EVENTS } from "#/pubsub";
import { CriticalAckSchema } from "#/schemas/diagnostics";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchLabOrderStep } from "#/workflow-steps/fetch-diagnostics";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { is, object, parse, string } from "valibot";

const CriticalAckInputSchema = object({ input: CriticalAckSchema });

interface AckEntry {
  [key: string]: string | null;
  ackBy: string;
  ackedAt: string;
  note: string | null;
  testCode: string;
}

const AckEntrySchema = object({ ackBy: string(), ackedAt: string(), testCode: string() });

function isAckEntry(value: JsonValue): value is AckEntry {
  if (value instanceof Date || Array.isArray(value)) {
    return false;
  }
  return is(AckEntrySchema, value);
}

export const criticalAck = Workflow.name("diagnostics.critical-ack")
  .input(CriticalAckInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CriticalAckSchema, input);
    const branchId = parsed.branchId ?? "main";

    const order = await ctx.step.run(fetchLabOrderStep, { id: parsed.orderId });
    if (order.branch_id !== branchId) {
      throw new Error("Lab order belongs to a different branch; verify the order and retry.");
    }

    await ctx.step.run("record-ack", async () => {
      const rawLog = order.payload.criticalAckLog;
      const log: AckEntry[] = Array.isArray(rawLog) ? rawLog.filter(isAckEntry) : [];
      const entry: AckEntry = {
        ackBy: parsed.ackBy,
        ackedAt: new Date().toISOString(),
        note: parsed.note ?? null,
        testCode: parsed.testCode,
      };
      await ctx.db
        .update(healthcareLabOrder)
        .set({
          payload: {
            ...order.payload,
            criticalAck: true,
            criticalAckAt: entry.ackedAt,
            criticalAckBy: parsed.ackBy,
            criticalAckLog: [...log, entry],
          },
        })
        .where(eq(healthcareLabOrder.id, order.id));
    });

    const dto = { orderId: order.id, testCode: parsed.testCode };
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: order.id,
        entityType: AUDIT_ENTITY_TYPE.DIAGNOSTICS,
        newState: { ackBy: parsed.ackBy, orderId: order.id, testCode: parsed.testCode },
      });
      await ctx.pubsub.publish(DIAGNOSTICS_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId,
        id: order.id,
      });
    });
    return dto;
  });
