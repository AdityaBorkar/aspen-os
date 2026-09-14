import { healthcareNursingTask } from "#/db-schemas/nursing";
import { NURSING_EVENTS } from "#/pubsub";
import { BranchIdSchema } from "#/schemas/utils";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { array, minLength, object, optional, parse, pipe, string } from "valibot";

const MirrorOrdersSchema = object({
  branchId: BranchIdSchema,
  encounterId: optional(string()),
  orders: optional(
    array(
      object({
        dueAt: optional(string()),
        encounterId: optional(string()),
        kind: optional(string(), "general"),
        orderId: optional(string()),
        patientId: pipe(string(), minLength(1)),
        title: pipe(string(), minLength(1)),
      }),
    ),
  ),
  patientId: optional(string()),
});

const TasksFromOrdersInputSchema = object({ input: MirrorOrdersSchema });

export const tasksFromOrders = Workflow.name("healthcare.nursing.tasks-from-orders")
  .input(TasksFromOrdersInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(MirrorOrdersSchema, input);
    const branchId = parsed.branchId ?? "main";
    const orders = (parsed.orders ?? []).filter((order) => {
      if (parsed.encounterId && order.encounterId && parsed.encounterId !== order.encounterId) {
        return false;
      }
      if (parsed.patientId && parsed.patientId !== order.patientId) {
        return false;
      }
      return true;
    });
    const mirrored = [];
    for (const order of orders) {
      const [row] = await ctx.step.run(`mirror-${order.orderId ?? order.title}`, async () =>
        ctx.db
          .insert(healthcareNursingTask)
          .values({
            branch_id: branchId,
            due_at: order.dueAt ? new Date(order.dueAt) : null,
            encounter_id: order.encounterId ?? parsed.encounterId ?? null,
            kind: order.kind ?? "general",
            order_id: order.orderId ?? null,
            patient_id: order.patientId,
            status: "open",
            title: order.title,
          })
          .returning(),
      );
      if (row) {
        mirrored.push({
          id: row.id,
          patientId: row.patient_id,
          status: row.status,
          title: row.title,
        });
      }
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: `${mirrored.length}`,
        entityType: AUDIT_ENTITY_TYPE.NURSING,
        newState: { mirrored: mirrored.length },
      });
      await ctx.pubsub.publish(NURSING_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: `${mirrored.length}`,
      });
    });
    return mirrored;
  });
