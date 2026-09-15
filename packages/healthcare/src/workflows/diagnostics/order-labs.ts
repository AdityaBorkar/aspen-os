import { healthcareLabOrder, healthcareLabTest } from "#/db-schemas/diagnostics";
import { DIAGNOSTICS_EVENTS } from "#/pubsub";
import { OrderLabsSchema } from "#/schemas/diagnostics";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { nextHealthcareSeries } from "#/workflow-steps/series";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, inArray } from "drizzle-orm";
import { object, parse } from "valibot";

const OrderLabsInputSchema = object({ input: OrderLabsSchema });

export const orderLabs = Workflow.name("healthcare.diagnostics.order-labs")
  .input(OrderLabsInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(OrderLabsSchema, input);
    const branchId = parsed.branchId ?? "main";

    if (parsed.tests.length === 0) {
      throw new Error("Lab order needs at least one test.");
    }
    const known = await ctx.step.run("verify-tests", async () => {
      const rows = await ctx.db
        .select()
        .from(healthcareLabTest)
        .where(
          and(
            eq(healthcareLabTest.branch_id, branchId),
            inArray(healthcareLabTest.id, parsed.tests),
          ),
        );
      return rows;
    });
    const knownIds = new Set(known.map((row) => row.id));
    const missing = parsed.tests.filter((id) => !knownIds.has(id));
    if (missing.length > 0) {
      throw new Error(`Unknown test ids: ${missing.join(", ")}; create the test masters first.`);
    }
    const inactive = known.filter((row) => row.payload.active === false);
    if (inactive.length > 0) {
      throw new Error(
        `Inactive tests cannot be ordered: ${inactive.map((row) => row.code).join(", ")}; reactivate the master first.`,
      );
    }

    const orderNo = await ctx.step.run(nextHealthcareSeries, { input: { series: "lab-order" } });
    const created = await ctx.step.run("create-order", async () => {
      const [row] = await ctx.db
        .insert(healthcareLabOrder)
        .values({
          branch_id: branchId,
          dx: parsed.dx ?? null,
          encounter_id: parsed.encounterId ?? null,
          is_billed: false,
          order_no: `LAB-${String(orderNo).padStart(6, "0")}`,
          patient_id: parsed.patientId,
          payer: parsed.payer ?? null,
          payload: {
            statusDetail: "ordered",
            testCodes: known.map((knownTest) => knownTest.code),
            tests: parsed.tests,
          },
          priority: parsed.priority,
          status: "ordered",
        })
        .returning();
      if (!row) {
        throw new Error("Failed to create lab order.");
      }
      return row;
    });

    const dto = {
      createdAt: created.created_at.toISOString(),
      dx: created.dx,
      encounterId: created.encounter_id,
      id: created.id,
      orderNo: created.order_no,
      patientId: created.patient_id,
      payer: created.payer,
      priority: created.priority,
      status: "ordered" as const,
      tests: parsed.tests,
    };
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: created.id,
        entityType: AUDIT_ENTITY_TYPE.DIAGNOSTICS,
        newState: { id: created.id, orderNo: created.order_no, patientId: created.patient_id },
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
