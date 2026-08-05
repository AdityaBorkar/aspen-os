import { Workflow, WorkflowStep } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import { object, parse } from "valibot";

import { type ComplianceObligation, complianceObligation } from "../db-schema";
import { COMPLIANCE_EVENTS } from "../pubsub-events";
import {
  CreateObligationSchema,
  type ObligationFilters,
  ObligationFiltersSchema,
  type PeriodPreview,
  type UpdateObligationInput,
  UpdateObligationSchema,
} from "../types";

const MONTHS_PER_FREQUENCY: Record<string, number> = {
  annual: 12,
  biennial: 24,
  monthly: 1,
  quarterly: 3,
  semi_annual: 6,
  triennial: 36,
};

const CreateInputSchema = object({ input: CreateObligationSchema });

const fetchObligationStep = WorkflowStep.name("fetch-obligation").handler(
  async (input: { id: string }, ctx) => {
    const [result] = await ctx.db
      .select()
      .from(complianceObligation)
      .where(eq(complianceObligation.id, input.id))
      .limit(1);

    if (!result) {
      throw new Error(`Compliance obligation with id "${input.id}" not found.`);
    }

    return result;
  },
);

const getObligationById = Workflow.name("obligation.get").handler(
  async (input: { id: string }, ctx) => {
    return ctx.step.run(fetchObligationStep, { id: input.id });
  },
);

const createObligation = Workflow.name("obligation.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = input;

    const defaultReminderDays =
      parsed.defaultReminderDays ??
      (parsed.expiryBased ? [90, 60, 30, 7] : [30, 15, 7, 1]);

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
        endDate: parsed.endDate
          ? parsed.endDate.toISOString().split("T")[0]
          : null,
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

    if (!result) throw new Error("Database operation returned no result");

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

const updateObligation = Workflow.name("obligation.update").handler(
  async (input: { id: string; patch: UpdateObligationInput }, ctx) => {
    const { id, patch } = input;
    const current = await ctx.step.run(fetchObligationStep, { id });
    const parsed = parse(UpdateObligationSchema, patch);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (parsed.name !== undefined) updateData.name = parsed.name;
    if (parsed.category !== undefined) updateData.category = parsed.category;
    if (parsed.documentType !== undefined)
      updateData.documentType = parsed.documentType;
    if (parsed.frequency !== undefined) updateData.frequency = parsed.frequency;
    if (parsed.customCron !== undefined)
      updateData.customCron = parsed.customCron;
    if (parsed.dueDay !== undefined) updateData.dueDay = parsed.dueDay;
    if (parsed.dueMonthOffset !== undefined)
      updateData.dueMonthOffset = parsed.dueMonthOffset;
    if (parsed.expiryBased !== undefined)
      updateData.expiryBased = parsed.expiryBased;
    if (parsed.expiryDurationMonths !== undefined)
      updateData.expiryDurationMonths = parsed.expiryDurationMonths;
    if (parsed.periodBased !== undefined)
      updateData.periodBased = parsed.periodBased;
    if (parsed.defaultReminderDays !== undefined)
      updateData.defaultReminderDays = parsed.defaultReminderDays;
    if (parsed.defaultEscalationDays !== undefined)
      updateData.defaultEscalationDays = parsed.defaultEscalationDays;
    if (parsed.defaultMetadata !== undefined)
      updateData.defaultMetadata = parsed.defaultMetadata;
    if (parsed.defaultIssuingAuthority !== undefined)
      updateData.defaultIssuingAuthority = parsed.defaultIssuingAuthority;
    if (parsed.defaultJurisdiction !== undefined)
      updateData.defaultJurisdiction = parsed.defaultJurisdiction;
    if (parsed.defaultAssignedReviewer !== undefined)
      updateData.defaultAssignedReviewer = parsed.defaultAssignedReviewer;
    if (parsed.defaultAssignedTo !== undefined)
      updateData.defaultAssignedTo = parsed.defaultAssignedTo;
    if (parsed.branch !== undefined) updateData.branch = parsed.branch;
    if (parsed.startDate !== undefined)
      updateData.startDate = parsed.startDate.toISOString().split("T")[0];
    if (parsed.endDate !== undefined)
      updateData.endDate = parsed.endDate
        ? parsed.endDate.toISOString().split("T")[0]
        : null;
    if (parsed.isActive !== undefined) updateData.isActive = parsed.isActive;
    if (parsed.autoGenerate !== undefined)
      updateData.autoGenerate = parsed.autoGenerate;

    const [updated] = await ctx.db
      .update(complianceObligation)
      .set(updateData)
      .where(eq(complianceObligation.id, id))
      .returning();

    if (!updated) throw new Error("Database operation returned no result");

    const changes: Record<string, { new: unknown; old: unknown }> = {};
    const oldRecord = current as unknown as Record<string, unknown>;
    const newRecord = updated as unknown as Record<string, unknown>;
    for (const key of Object.keys(updateData)) {
      if (key === "updatedAt") continue;
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
      newState: updated as unknown as Record<string, unknown>,
      previousState: current as unknown as Record<string, unknown>,
    });

    await ctx.pubsub.publish(COMPLIANCE_EVENTS.OBLIGATION_UPDATED, {
      changes,
      obligation: { id: updated.id, name: updated.name },
    });

    return updated;
  },
);

const activateObligation = Workflow.name("obligation.activate").handler(
  async (input: { id: string }, ctx) => {
    const [updated] = await ctx.db
      .update(complianceObligation)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(complianceObligation.id, input.id))
      .returning();

    if (!updated) throw new Error("Database operation returned no result");

    await ctx.audit.write({
      action: "obligation_activated",
      entityId: input.id,
      entityType: "compliance_obligation",
    });

    await ctx.pubsub.publish(COMPLIANCE_EVENTS.OBLIGATION_ACTIVATED, {
      obligationId: input.id,
    });

    return updated;
  },
);

const deactivateObligation = Workflow.name("obligation.deactivate").handler(
  async (input: { id: string }, ctx) => {
    const [updated] = await ctx.db
      .update(complianceObligation)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(complianceObligation.id, input.id))
      .returning();

    if (!updated) throw new Error("Database operation returned no result");

    await ctx.audit.write({
      action: "obligation_deactivated",
      entityId: input.id,
      entityType: "compliance_obligation",
    });

    await ctx.pubsub.publish(COMPLIANCE_EVENTS.OBLIGATION_DEACTIVATED, {
      obligationId: input.id,
    });

    return updated;
  },
);

const listObligations = Workflow.name("obligation.list").handler(
  async (input: { filters?: ObligationFilters }, ctx) => {
    const filters = input.filters;
    const parsed = filters ? parse(ObligationFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.category) {
      conditions.push(eq(complianceObligation.category, parsed.category));
    }
    if (parsed.sourceModule) {
      conditions.push(
        eq(complianceObligation.sourceModule, parsed.sourceModule),
      );
    }
    if (parsed.active !== undefined) {
      conditions.push(eq(complianceObligation.isActive, parsed.active));
    }
    if (parsed.expiryBased !== undefined) {
      conditions.push(eq(complianceObligation.expiryBased, parsed.expiryBased));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return ctx.db
      .select()
      .from(complianceObligation)
      .where(whereClause)
      .orderBy(desc(complianceObligation.updatedAt));
  },
);

const getActiveObligations = Workflow.name("obligation.active").handler(
  async (_input: Record<string, never>, ctx) => {
    return ctx.db
      .select()
      .from(complianceObligation)
      .where(
        and(
          eq(complianceObligation.isActive, true),
          eq(complianceObligation.autoGenerate, true),
        ),
      );
  },
);

const getUpcomingPeriods = Workflow.name("obligation.upcoming-periods").handler(
  async (input: { obligation: ComplianceObligation; count: number }, _ctx) => {
    const { obligation, count } = input;
    const periods: PeriodPreview[] = [];
    const startDate = new Date(obligation.startDate);

    if (obligation.frequency === "custom") {
      return periods;
    }

    const monthsPerPeriod = MONTHS_PER_FREQUENCY[obligation.frequency] ?? 1;

    for (let i = 0; i < count; i++) {
      const periodStart = new Date(
        startDate.getFullYear(),
        startDate.getMonth() + i * monthsPerPeriod,
        1,
      );
      const periodEnd = new Date(
        startDate.getFullYear(),
        startDate.getMonth() + (i + 1) * monthsPerPeriod,
        0,
      );

      const entry: PeriodPreview = {
        dueDate: null,
        expiryDate: null,
        periodEnd: null,
        periodStart: null,
      };

      if (obligation.periodBased) {
        entry.periodStart = periodStart.toISOString().split("T")[0] ?? null;
        entry.periodEnd = periodEnd.toISOString().split("T")[0] ?? null;
      }

      if (obligation.expiryBased && obligation.expiryDurationMonths) {
        const expiryDate = new Date(periodStart);
        expiryDate.setMonth(
          expiryDate.getMonth() + obligation.expiryDurationMonths,
        );
        entry.expiryDate = expiryDate.toISOString().split("T")[0] ?? null;
      } else if (!obligation.expiryBased) {
        const dueDate = new Date(periodEnd);
        const offset = obligation.dueMonthOffset ?? 0;
        dueDate.setMonth(dueDate.getMonth() + offset);
        if (obligation.dueDay) {
          const lastDay = new Date(
            dueDate.getFullYear(),
            dueDate.getMonth() + 1,
            0,
          ).getDate();
          dueDate.setDate(Math.min(obligation.dueDay, lastDay));
        }
        entry.dueDate = dueDate.toISOString().split("T")[0] ?? null;
      }

      periods.push(entry);
    }

    return periods;
  },
);

export const obligations = {
  activate: activateObligation,
  create: createObligation,
  deactivate: deactivateObligation,
  get: getObligationById,
  getActive: getActiveObligations,
  getById: getObligationById,
  getUpcomingPeriods,
  list: listObligations,
  update: updateObligation,
} as const;
