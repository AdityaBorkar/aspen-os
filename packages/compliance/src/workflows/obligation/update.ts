import { complianceObligation } from "#/db-schemas";
import { COMPLIANCE_EVENTS } from "#/pubsub";
import { UpdateObligationSchema } from "#/types";
import type { UpdateObligationInput } from "#/types";
import { fetchObligationStep } from "#/workflow-steps/fetch-obligation";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { parse } from "valibot";

const updateObligation = Workflow.name("obligation.update").handler(
  async (input: { id: string; patch: UpdateObligationInput }, ctx) => {
    const { id, patch } = input;
    const current = await ctx.step.run(fetchObligationStep, { id });
    const parsed = parse(UpdateObligationSchema, patch);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (parsed.name !== undefined) {
      updateData.name = parsed.name;
    }
    if (parsed.category !== undefined) {
      updateData.category = parsed.category;
    }
    if (parsed.documentType !== undefined) {
      updateData.documentType = parsed.documentType;
    }
    if (parsed.frequency !== undefined) {
      updateData.frequency = parsed.frequency;
    }
    if (parsed.customCron !== undefined) {
      updateData.customCron = parsed.customCron;
    }
    if (parsed.dueDay !== undefined) {
      updateData.dueDay = parsed.dueDay;
    }
    if (parsed.dueMonthOffset !== undefined) {
      updateData.dueMonthOffset = parsed.dueMonthOffset;
    }
    if (parsed.expiryBased !== undefined) {
      updateData.expiryBased = parsed.expiryBased;
    }
    if (parsed.expiryDurationMonths !== undefined) {
      updateData.expiryDurationMonths = parsed.expiryDurationMonths;
    }
    if (parsed.periodBased !== undefined) {
      updateData.periodBased = parsed.periodBased;
    }
    if (parsed.defaultReminderDays !== undefined) {
      updateData.defaultReminderDays = parsed.defaultReminderDays;
    }
    if (parsed.defaultEscalationDays !== undefined) {
      updateData.defaultEscalationDays = parsed.defaultEscalationDays;
    }
    if (parsed.defaultMetadata !== undefined) {
      updateData.defaultMetadata = parsed.defaultMetadata;
    }
    if (parsed.defaultIssuingAuthority !== undefined) {
      updateData.defaultIssuingAuthority = parsed.defaultIssuingAuthority;
    }
    if (parsed.defaultJurisdiction !== undefined) {
      updateData.defaultJurisdiction = parsed.defaultJurisdiction;
    }
    if (parsed.defaultAssignedReviewer !== undefined) {
      updateData.defaultAssignedReviewer = parsed.defaultAssignedReviewer;
    }
    if (parsed.defaultAssignedTo !== undefined) {
      updateData.defaultAssignedTo = parsed.defaultAssignedTo;
    }
    if (parsed.branch !== undefined) {
      updateData.branch = parsed.branch;
    }
    if (parsed.startDate !== undefined) {
      const [date] = parsed.startDate.toISOString().split("T");
      updateData.startDate = date;
    }
    if (parsed.endDate !== undefined) {
      updateData.endDate = parsed.endDate ? parsed.endDate.toISOString().split("T")[0] : null;
    }
    if (parsed.isActive !== undefined) {
      updateData.isActive = parsed.isActive;
    }
    if (parsed.autoGenerate !== undefined) {
      updateData.autoGenerate = parsed.autoGenerate;
    }

    const [updated] = await ctx.db
      .update(complianceObligation)
      .set(updateData)
      .where(eq(complianceObligation.id, id))
      .returning();

    if (!updated) {
      throw new Error("Database operation returned no result");
    }

    const changes: Record<string, { new: unknown; old: unknown }> = {};
    const oldRecord = current as unknown as Record<string, unknown>;
    const newRecord = updated as unknown as Record<string, unknown>;
    for (const key of Object.keys(updateData)) {
      if (key === "updatedAt") {
        continue;
      }
      const oldVal = oldRecord[key];
      const newVal = newRecord[key];
      if (oldVal !== newVal) {
        changes[key] = { new: newVal, old: oldVal };
      }
    }

    await ctx.audit.write({
      action: "updated",
      actorId: current.createdBy,
      changes,
      crudAction: "update",
      entityId: id,
      entityType: "compliance_obligation",
      newState: updated,
      previousState: current,
    });

    await ctx.pubsub.publish(COMPLIANCE_EVENTS.OBLIGATION_UPDATED, {
      changes,
      obligation: { id: updated.id, name: updated.name },
    });

    return updated;
  },
);

export { updateObligation };
