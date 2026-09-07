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
        autoGenerate: parsed.autoGenerate ?? true,
        branch: parsed.branch ?? null,
        category: parsed.category,
        createdBy: parsed.createdBy,
        customCron: parsed.customCron ?? null,
        defaultAssignedReviewer: parsed.defaultAssignedReviewer ?? null,
        defaultAssignedTo: parsed.defaultAssignedTo ?? null,
        defaultEscalationDays: parsed.defaultEscalationDays ?? null,
        defaultIssuingAuthority: parsed.defaultIssuingAuthority ?? null,
        defaultJurisdiction: parsed.defaultJurisdiction ?? null,
        defaultMetadata: parsed.defaultMetadata ?? null,
        defaultReminderDays,
        documentType: parsed.documentType ?? null,
        dueDay: parsed.dueDay ?? null,
        dueMonthOffset: parsed.dueMonthOffset ?? null,
        endDate: parsed.endDate ? toDateOnly(parsed.endDate) : null,
        expiryBased: parsed.expiryBased ?? false,
        expiryDurationMonths: parsed.expiryDurationMonths ?? null,
        frequency: parsed.frequency,
        isActive: parsed.isActive ?? true,
        name: parsed.name,
        periodBased: parsed.periodBased ?? false,
        sourceEntityId: parsed.sourceEntityId ?? null,
        sourceEntityType: parsed.sourceEntityType ?? null,
        sourceModule: parsed.sourceModule,
        startDate: toDateOnly(parsed.startDate),
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
