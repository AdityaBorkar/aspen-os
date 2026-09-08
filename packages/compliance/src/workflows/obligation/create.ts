import { complianceObligation } from "#/db-schemas";
import { COMPLIANCE_EVENTS } from "#/pubsub";
import { CreateObligationSchema } from "#/schemas";
import { reminderDefaults } from "#/utils/constants";
import { toDateOnly } from "#/utils/dates";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const CreateInputSchema = object({ input: CreateObligationSchema });

const createObligation = Workflow.name("obligation.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = input;

    const defaultReminderDays = parsed.defaultReminderDays ?? reminderDefaults(parsed.expiryBased);

    const [result] = await ctx.db
      .insert(complianceObligation)
      .values({
        auto_generate: parsed.autoGenerate ?? true,
        branch: parsed.branch ?? null,
        category: parsed.category,
        created_by: parsed.createdBy,
        custom_cron: parsed.customCron ?? null,
        default_assigned_reviewer: parsed.defaultAssignedReviewer ?? null,
        default_assigned_to: parsed.defaultAssignedTo ?? null,
        default_escalation_days: parsed.defaultEscalationDays ?? null,
        default_issuing_authority: parsed.defaultIssuingAuthority ?? null,
        default_jurisdiction: parsed.defaultJurisdiction ?? null,
        default_metadata: parsed.defaultMetadata ?? null,
        default_reminder_days: defaultReminderDays,
        document_type: parsed.documentType ?? null,
        due_day: parsed.dueDay ?? null,
        due_month_offset: parsed.dueMonthOffset ?? null,
        end_date: parsed.endDate ? toDateOnly(parsed.endDate) : null,
        expiry_based: parsed.expiryBased ?? false,
        expiry_duration_months: parsed.expiryDurationMonths ?? null,
        frequency: parsed.frequency,
        is_active: parsed.isActive ?? true,
        name: parsed.name,
        period_based: parsed.periodBased ?? false,
        source_entity_id: parsed.sourceEntityId ?? null,
        source_entity_type: parsed.sourceEntityType ?? null,
        source_module: parsed.sourceModule,
        start_date: toDateOnly(parsed.startDate),
      })
      .returning();

    if (!result) {
      throw new Error("Database operation returned no result");
    }

    await ctx.audit.write({
      action: "created",
      actorId: parsed.createdBy,
      crudAction: "create",
      entityId: result.id,
      entityType: "compliance_obligation",
      newState: result,
    });

    await ctx.pubsub.publish(COMPLIANCE_EVENTS.OBLIGATION_CREATED, {
      obligation: {
        category: result.category,
        id: result.id,
        name: result.name,
      },
    });

    return result;
  });

export { createObligation };
