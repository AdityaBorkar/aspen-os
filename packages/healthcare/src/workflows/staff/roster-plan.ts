import { healthcareRosterEntry } from "#/db-schemas/staff";
import { OPERATIONS_EVENTS } from "#/pubsub";
import { PlanRosterSchema } from "#/schemas/staff";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchStaffStep } from "#/workflow-steps/fetch-staff";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const RosterPlanInputSchema = object({ input: PlanRosterSchema });

export const rosterPlan = Workflow.name("healthcare.staff.roster-plan")
  .input(RosterPlanInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(PlanRosterSchema, input);
    const branchId = parsed.branchId ?? "main";
    if (parsed.entries.length === 0) {
      throw new Error("Roster needs at least one entry; add entries and retry");
    }
    // oxlint-disable eslint/no-await-in-loop
    for (const entry of parsed.entries) {
      await ctx.step.run(fetchStaffStep, { id: entry.staffId });
      if (!entry.date.startsWith(parsed.month)) {
        throw new Error(
          `Entry date ${entry.date} is outside roster month ${parsed.month}; fix the date and retry`,
        );
      }
    }
    // oxlint-enable eslint/no-await-in-loop
    const inserted = [];
    // oxlint-disable eslint/no-await-in-loop
    for (const entry of parsed.entries) {
      const [row] = await ctx.step.run(`roster-${entry.staffId}-${entry.date}`, async () =>
        ctx.db
          .insert(healthcareRosterEntry)
          .values({
            branch_id: branchId,
            date: entry.date,
            month: parsed.month,
            shift: entry.shift,
            staff_id: entry.staffId,
          })
          .returning(),
      );
      if (row) {
        inserted.push(row.id);
      }
    }
    // oxlint-enable eslint/no-await-in-loop
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: parsed.month,
        entityType: AUDIT_ENTITY_TYPE.OPERATIONS,
        newState: { entries: inserted.length, month: parsed.month },
      });
      // Roster plans map to hr-attendance.shift; HR owns the shift record,
      // healthcare keeps the deprecated month-bucketed mirror with the hr
      // intent attached.
      await ctx.pubsub.publish(OPERATIONS_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        data: {
          entries: inserted.length,
          hrOwner: "hr-attendance.shift",
          month: parsed.month,
        },
        id: parsed.month,
      });
    });
    return { entries: inserted.length, month: parsed.month };
  });
