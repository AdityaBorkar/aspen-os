import { healthcareStaff } from "#/db-schemas/staff";
import { OPERATIONS_EVENTS } from "#/pubsub";
import { UpsertStaffSchema } from "#/schemas/staff";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { is, object, parse, string } from "valibot";

const UpsertStaffInputSchema = object({ input: UpsertStaffSchema });

function readStaffPayload(payload: Record<string, JsonValue>) {
  const department = is(string(), payload.department) ? payload.department : null;
  const exitDate = is(string(), payload.exitDate) ? payload.exitDate : null;
  return { department, exitDate };
}

export const upsertStaff = Workflow.name("healthcare.staff.upsert-staff")
  .input(UpsertStaffInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(UpsertStaffSchema, input);
    const branchId = parsed.branchId ?? "main";
    const values = {
      branch_id: branchId,
      doj: parsed.doj ?? null,
      name: parsed.name,
      payload: {
        department: parsed.department ?? null,
        exitDate: parsed.exitDate ?? null,
      },
      phone: parsed.phone ?? null,
      role: parsed.role,
      status: parsed.status ?? "active",
    };
    const [row] = await ctx.step.run("upsert-staff", async () => {
      if (parsed.staffId) {
        return ctx.db
          .update(healthcareStaff)
          .set({ ...values, updated_at: new Date() })
          .where(eq(healthcareStaff.id, parsed.staffId))
          .returning();
      }
      return ctx.db.insert(healthcareStaff).values(values).returning();
    });
    if (!row) {
      throw new Error("Failed to upsert staff.");
    }
    const staffPayload = readStaffPayload(row.payload);
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.OPERATIONS,
        newState: { name: row.name, role: row.role, status: row.status },
      });
      await ctx.pubsub.publish(OPERATIONS_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: row.id,
      });
    });
    return {
      department: staffPayload.department,
      exitDate: staffPayload.exitDate,
      id: row.id,
      name: row.name,
      role: row.role,
      status: row.status,
    };
  });
