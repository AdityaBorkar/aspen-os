import { healthcareReportDefinition } from "#/db-schemas/operations";
import { OPERATIONS_EVENTS } from "#/pubsub";
import { DefineReportSchema } from "#/schemas/operations";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const ReportsDefineInputSchema = object({ input: DefineReportSchema });

const ALLOWLISTED_REPORT_COLLECTIONS = new Set([
  "healthcare_invoice",
  "healthcare_receipt",
  "healthcare_package_balance",
  "healthcare_resident",
  "healthcare_daily_log",
  "healthcare_nursing_task",
  "healthcare_drug_administration",
  "healthcare_clinical_document",
  "healthcare_medical_register",
  "healthcare_staff",
  "healthcare_attendance",
  "healthcare_leave_request",
]);

export const reportsDefine = Workflow.name("healthcare.operations.reports-define")
  .input(ReportsDefineInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(DefineReportSchema, input);
    const branchId = parsed.branchId ?? "main";
    if (!ALLOWLISTED_REPORT_COLLECTIONS.has(parsed.collection)) {
      throw new Error(
        `Collection ${parsed.collection} is not reportable; use an allowlisted collection`,
      );
    }
    const [row] = await ctx.step.run("insert-report", async () =>
      ctx.db
        .insert(healthcareReportDefinition)
        .values({
          branch_id: branchId,
          collection: parsed.collection,
          filters: parsed.filters ?? null,
          name: parsed.name,
          status: "draft",
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to define report.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.OPERATIONS,
        newState: { collection: row.collection, name: row.name },
      });
      await ctx.pubsub.publish(OPERATIONS_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: row.id,
      });
    });
    return { collection: row.collection, id: row.id, name: row.name };
  });
