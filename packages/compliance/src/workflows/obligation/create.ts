import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { complianceObligation } from "../../db-schemas";
import { COMPLIANCE_EVENTS } from "../../pubsub";
import { CreateObligationSchema } from "../../types";

const CreateInputSchema = object({ input: CreateObligationSchema });

const createObligation = Workflow.name("obligation.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = input;

    const defaultReminderDays =
      parsed.defaultReminderDays ?? (parsed.expiryBased ? [90, 60, 30, 7] : [30, 15, 7, 1]);

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
        endDate: parsed.endDate ? parsed.endDate.toISOString().split("T")[0] : null,
        expiryBased: parsed.expiryBased ?? false,
        expiryDurationMonths: parsed.expiryDurationMonths ?? null,
        frequency: parsed.frequency,
        isActive: parsed.isActive ?? true,
        name: parsed.name,
        periodBased: parsed.periodBased ?? false,
        sourceEntityId: parsed.sourceEntityId ?? null,
        sourceEntityType: parsed.sourceEntityType ?? null,
        sourceModule: parsed.sourceModule,
        startDate: parsed.startDate.toISOString().slice(0, 10),
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
      newState: result as unknown as Record<string, unknown>,
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
