import { Workflow, WorkflowStep } from "@aspen-os/platform/server";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
} from "drizzle-orm";
import { object, parse } from "valibot";

import type { AuditAction, VerificationStatus } from "../constants";
import { type ComplianceDocument, complianceDocument } from "../db-schema";
import { COMPLIANCE_EVENTS } from "../pubsub-events";
import { daysUntil } from "../services/status-derivation";
import {
  type ComplianceDocumentFilters,
  ComplianceDocumentFiltersSchema,
  type CreateComplianceDocumentInput,
  CreateComplianceDocumentSchema,
  type RenewalChainEntry,
  type TimelineEntry,
  type UpdateComplianceDocumentInput,
  UpdateComplianceDocumentSchema,
} from "../types";

const DEFAULT_REMINDER_DAYS = [90, 60, 30, 7];

const CreateInputSchema = object({ input: CreateComplianceDocumentSchema });

const fetchDocumentStep = WorkflowStep.name("fetch-document").handler(
  async (input: { id: string }, ctx) => {
    const [result] = await ctx.db
      .select()
      .from(complianceDocument)
      .where(eq(complianceDocument.id, input.id))
      .limit(1);

    if (!result) {
      throw new Error(`Compliance document with id "${input.id}" not found.`);
    }

    return result;
  },
);

const getDocumentById = Workflow.name("document.get").handler(
  async (input: { id: string }, ctx) => {
    return ctx.step.run(fetchDocumentStep, { id: input.id });
  },
);

const createDocument = Workflow.name("document.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = input;

    const reminderDays = parsed.reminderDays ?? DEFAULT_REMINDER_DAYS;

    const [result] = await ctx.db
      .insert(complianceDocument)
      .values({
        assignedReviewer: parsed.assignedReviewer ?? null,
        assignedTo: parsed.assignedTo ?? null,
        attachment: parsed.attachment ?? null,
        autoRenewal: parsed.autoRenewal ?? false,
        branch: parsed.branch ?? null,
        category: parsed.category,
        connection: parsed.connection ?? null,
        createdBy: parsed.createdBy,
        documentType: parsed.documentType ?? null,
        dueDate: parsed.dueDate
          ? parsed.dueDate.toISOString().split("T")[0]
          : null,
        effectiveDate: parsed.effectiveDate
          ? parsed.effectiveDate.toISOString().split("T")[0]
          : null,
        escalationDays: parsed.escalationDays ?? null,
        expiryDate: parsed.expiryDate
          ? parsed.expiryDate.toISOString().split("T")[0]
          : null,
        issueDate: parsed.issueDate
          ? parsed.issueDate.toISOString().split("T")[0]
          : null,
        issuingAuthority: parsed.issuingAuthority ?? null,
        jurisdiction: parsed.jurisdiction ?? null,
        metadata: parsed.metadata ?? null,
        name: parsed.name,
        notes: parsed.notes ?? null,
        obligationId: parsed.obligationId ?? null,
        periodEnd: parsed.periodEnd
          ? parsed.periodEnd.toISOString().split("T")[0]
          : null,
        periodStart: parsed.periodStart
          ? parsed.periodStart.toISOString().split("T")[0]
          : null,
        referenceNumber: parsed.referenceNumber ?? null,
        reminderChannel: parsed.reminderChannel ?? "pubsub",
        reminderDays,
        renewalDate: parsed.renewalDate
          ? parsed.renewalDate.toISOString().split("T")[0]
          : null,
        renewalFrequency: parsed.renewalFrequency ?? null,
        sourceEntityId: parsed.sourceEntityId ?? null,
        sourceEntityType: parsed.sourceEntityType ?? null,
        sourceModule: parsed.sourceModule,
        verificationStatus: "draft",
      })
      .returning();

    if (!result) throw new Error("Database operation returned no result");

    await ctx.audit.write({
      action: "created",
      actorId: parsed.createdBy,
      crudAction: "create",
      entityId: result.id,
      entityType: "compliance_document",
      newState: result as unknown as Record<string, unknown>,
    });

    await ctx.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_CREATED, {
      document: {
        category: result.category,
        id: result.id,
        name: result.name,
      },
    });

    return result;
  });

const updateDocument = Workflow.name("document.update").handler(
  async (input: { id: string; patch: UpdateComplianceDocumentInput }, ctx) => {
    const { id, patch } = input;
    const current = await ctx.step.run(fetchDocumentStep, { id });
    const parsed = parse(UpdateComplianceDocumentSchema, patch);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (parsed.name !== undefined) updateData.name = parsed.name;
    if (parsed.category !== undefined) updateData.category = parsed.category;
    if (parsed.documentType !== undefined)
      updateData.documentType = parsed.documentType;
    if (parsed.referenceNumber !== undefined)
      updateData.referenceNumber = parsed.referenceNumber;
    if (parsed.issuingAuthority !== undefined)
      updateData.issuingAuthority = parsed.issuingAuthority;
    if (parsed.jurisdiction !== undefined)
      updateData.jurisdiction = parsed.jurisdiction;
    if (parsed.issueDate !== undefined)
      updateData.issueDate = parsed.issueDate
        ? parsed.issueDate.toISOString().split("T")[0]
        : null;
    if (parsed.expiryDate !== undefined)
      updateData.expiryDate = parsed.expiryDate
        ? parsed.expiryDate.toISOString().split("T")[0]
        : null;
    if (parsed.dueDate !== undefined)
      updateData.dueDate = parsed.dueDate
        ? parsed.dueDate.toISOString().split("T")[0]
        : null;
    if (parsed.effectiveDate !== undefined)
      updateData.effectiveDate = parsed.effectiveDate
        ? parsed.effectiveDate.toISOString().split("T")[0]
        : null;
    if (parsed.periodStart !== undefined)
      updateData.periodStart = parsed.periodStart
        ? parsed.periodStart.toISOString().split("T")[0]
        : null;
    if (parsed.periodEnd !== undefined)
      updateData.periodEnd = parsed.periodEnd
        ? parsed.periodEnd.toISOString().split("T")[0]
        : null;
    if (parsed.renewalDate !== undefined)
      updateData.renewalDate = parsed.renewalDate
        ? parsed.renewalDate.toISOString().split("T")[0]
        : null;
    if (parsed.renewalFrequency !== undefined)
      updateData.renewalFrequency = parsed.renewalFrequency;
    if (parsed.autoRenewal !== undefined)
      updateData.autoRenewal = parsed.autoRenewal;
    if (parsed.reminderDays !== undefined)
      updateData.reminderDays = parsed.reminderDays;
    if (parsed.escalationDays !== undefined)
      updateData.escalationDays = parsed.escalationDays;
    if (parsed.branch !== undefined) updateData.branch = parsed.branch;
    if (parsed.connection !== undefined)
      updateData.connection = parsed.connection;
    if (parsed.attachment !== undefined)
      updateData.attachment = parsed.attachment;
    if (parsed.notes !== undefined) updateData.notes = parsed.notes;
    if (parsed.metadata !== undefined) updateData.metadata = parsed.metadata;
    if (parsed.assignedReviewer !== undefined)
      updateData.assignedReviewer = parsed.assignedReviewer;
    if (parsed.assignedTo !== undefined)
      updateData.assignedTo = parsed.assignedTo;
    if (parsed.reminderChannel !== undefined)
      updateData.reminderChannel = parsed.reminderChannel;
    if (parsed.verificationStatus !== undefined)
      updateData.verificationStatus = parsed.verificationStatus;

    const [updated] = await ctx.db
      .update(complianceDocument)
      .set(updateData)
      .where(eq(complianceDocument.id, id))
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
      entityType: "compliance_document",
      newState: updated as unknown as Record<string, unknown>,
      previousState: current as unknown as Record<string, unknown>,
    });

    await ctx.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_UPDATED, {
      changes,
      document: { id: updated.id, name: updated.name },
    });

    return updated;
  },
);

const uploadDocumentAttachment = Workflow.name(
  "document.upload-attachment",
).handler(async (input: { id: string; storageKey: string }, ctx) => {
  const { id, storageKey } = input;
  const current = await ctx.step.run(fetchDocumentStep, { id });

  const [updated] = await ctx.db
    .update(complianceDocument)
    .set({ attachment: storageKey, updatedAt: new Date() })
    .where(eq(complianceDocument.id, id))
    .returning();

  if (!updated) throw new Error("Database operation returned no result");

  await ctx.audit.write({
    action: "attachment_uploaded",
    actorId: current.createdBy,
    entityId: id,
    entityType: "compliance_document",
    metadata: { storageKey },
  });

  await ctx.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_ATTACHMENT_UPLOADED, {
    documentId: id,
    storageKey,
  });

  return updated;
});

const submitDocument = Workflow.name("document.submit").handler(
  async (input: { id: string }, ctx) => {
    const { id } = input;
    const current = await ctx.step.run(fetchDocumentStep, { id });

    if (
      current.verificationStatus !== "draft" &&
      current.verificationStatus !== "rejected"
    ) {
      throw new Error(
        `Cannot submit document in status "${current.verificationStatus}"`,
      );
    }

    const [updated] = await ctx.db
      .update(complianceDocument)
      .set({ updatedAt: new Date(), verificationStatus: "submitted" })
      .where(eq(complianceDocument.id, id))
      .returning();

    if (!updated) throw new Error("Database operation returned no result");

    await ctx.audit.write({
      action: "submitted",
      actorId: current.createdBy,
      entityId: id,
      entityType: "compliance_document",
      previousState: { verificationStatus: current.verificationStatus },
    });

    await ctx.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_SUBMITTED, {
      documentId: id,
      submittedBy: current.createdBy,
    });

    return updated;
  },
);

const assignDocumentReviewer = Workflow.name(
  "document.assign-reviewer",
).handler(async (input: { id: string; userId: string }, ctx) => {
  const { id, userId } = input;
  const current = await ctx.step.run(fetchDocumentStep, { id });

  const newStatus: VerificationStatus =
    current.verificationStatus === "submitted" ||
    current.verificationStatus === "rejected"
      ? "under_review"
      : current.verificationStatus;

  const [updated] = await ctx.db
    .update(complianceDocument)
    .set({
      assignedReviewer: userId,
      updatedAt: new Date(),
      verificationStatus: newStatus,
    })
    .where(eq(complianceDocument.id, id))
    .returning();

  if (!updated) throw new Error("Database operation returned no result");

  await ctx.audit.write({
    action: "reviewer_assigned",
    actorId: userId,
    entityId: id,
    entityType: "compliance_document",
    metadata: { reviewerId: userId },
    previousState: {
      assignedReviewer: current.assignedReviewer,
      verificationStatus: current.verificationStatus,
    },
  });

  await ctx.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_REVIEWER_ASSIGNED, {
    documentId: id,
    reviewerId: userId,
  });

  return updated;
});

const assignDocumentTo = Workflow.name("document.assign-to").handler(
  async (input: { id: string; userId: string }, ctx) => {
    const { id, userId } = input;
    const current = await ctx.step.run(fetchDocumentStep, { id });

    const [updated] = await ctx.db
      .update(complianceDocument)
      .set({ assignedTo: userId, updatedAt: new Date() })
      .where(eq(complianceDocument.id, id))
      .returning();

    if (!updated) throw new Error("Database operation returned no result");

    await ctx.audit.write({
      action: "updated",
      actorId: current.createdBy,
      entityId: id,
      entityType: "compliance_document",
      metadata: { assigneeId: userId },
      previousState: { assignedTo: current.assignedTo },
    });

    return updated;
  },
);

const verifyDocument = Workflow.name("document.verify").handler(
  async (input: { id: string; reviewerId: string }, ctx) => {
    const { id, reviewerId } = input;
    const current = await ctx.step.run(fetchDocumentStep, { id });

    if (current.verificationStatus !== "under_review") {
      throw new Error(
        `Cannot verify document in status "${current.verificationStatus}"`,
      );
    }

    const now = new Date();
    const [updated] = await ctx.db
      .update(complianceDocument)
      .set({
        reviewedAt: now,
        reviewedBy: reviewerId,
        updatedAt: now,
        verificationStatus: "verified",
      })
      .where(eq(complianceDocument.id, id))
      .returning();

    if (!updated) throw new Error("Database operation returned no result");

    await ctx.audit.write({
      action: "verified",
      actorId: reviewerId,
      entityId: id,
      entityType: "compliance_document",
      previousState: { verificationStatus: current.verificationStatus },
    });

    await ctx.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_VERIFIED, {
      category: updated.category,
      documentId: id,
      sourceEntityId: updated.sourceEntityId,
      sourceModule: updated.sourceModule,
      verifiedBy: reviewerId,
    });

    return updated;
  },
);

const rejectDocument = Workflow.name("document.reject").handler(
  async (input: { id: string; reviewerId: string; reason: string }, ctx) => {
    const { id, reviewerId, reason } = input;
    const current = await ctx.step.run(fetchDocumentStep, { id });

    if (current.verificationStatus !== "under_review") {
      throw new Error(
        `Cannot reject document in status "${current.verificationStatus}"`,
      );
    }

    const [updated] = await ctx.db
      .update(complianceDocument)
      .set({
        rejectionReason: reason,
        reviewedAt: new Date(),
        reviewedBy: reviewerId,
        updatedAt: new Date(),
        verificationStatus: "rejected",
      })
      .where(eq(complianceDocument.id, id))
      .returning();

    if (!updated) throw new Error("Database operation returned no result");

    await ctx.audit.write({
      action: "rejected",
      actorId: reviewerId,
      entityId: id,
      entityType: "compliance_document",
      metadata: { reason },
      previousState: { verificationStatus: current.verificationStatus },
    });

    await ctx.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_REJECTED, {
      category: updated.category,
      documentId: id,
      reason,
      rejectedBy: reviewerId,
      sourceEntityId: updated.sourceEntityId,
      sourceModule: updated.sourceModule,
    });

    return updated;
  },
);

const completeDocument = Workflow.name("document.complete").handler(
  async (
    input: {
      id: string;
      data: {
        completedAt?: Date;
        referenceNumber?: string;
        attachmentKey?: string;
      };
    },
    ctx,
  ) => {
    const { id, data } = input;
    const current = await ctx.step.run(fetchDocumentStep, { id });
    const completedAt = data.completedAt ?? new Date();

    const [updated] = await ctx.db
      .update(complianceDocument)
      .set({
        attachment: data.attachmentKey ?? current.attachment,
        completedAt,
        referenceNumber: data.referenceNumber ?? current.referenceNumber,
        updatedAt: new Date(),
        verificationStatus: "verified",
      })
      .where(eq(complianceDocument.id, id))
      .returning();

    if (!updated) throw new Error("Database operation returned no result");

    await ctx.audit.write({
      action: "completed",
      actorId: current.createdBy,
      entityId: id,
      entityType: "compliance_document",
      metadata: {
        completedAt: completedAt.toISOString(),
        referenceNumber: data.referenceNumber ?? null,
      },
    });

    await ctx.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_COMPLETED, {
      completedAt: completedAt.toISOString(),
      documentId: id,
      referenceNumber: data.referenceNumber ?? null,
      sourceEntityId: updated.sourceEntityId,
      sourceModule: updated.sourceModule,
    });

    return updated;
  },
);

const markRenewalInProgress = Workflow.name(
  "document.mark-renewal-in-progress",
).handler(async (input: { id: string }, ctx) => {
  const { id } = input;
  const current = await ctx.step.run(fetchDocumentStep, { id });

  const [updated] = await ctx.db
    .update(complianceDocument)
    .set({ updatedAt: new Date(), verificationStatus: "submitted" })
    .where(eq(complianceDocument.id, id))
    .returning();

  if (!updated) throw new Error("Database operation returned no result");

  await ctx.audit.write({
    action: "updated",
    actorId: current.createdBy,
    entityId: id,
    entityType: "compliance_document",
    metadata: { note: "Renewal in progress" },
    previousState: { verificationStatus: current.verificationStatus },
  });

  return updated;
});

const renewDocument = Workflow.name("document.renew").handler(
  async (
    input: { id: string; newData: Partial<CreateComplianceDocumentInput> },
    ctx,
  ) => {
    const { id, newData } = input;
    const current = await ctx.step.run(fetchDocumentStep, { id });

    await ctx.db
      .update(complianceDocument)
      .set({ updatedAt: new Date(), verificationStatus: "renewed" })
      .where(eq(complianceDocument.id, id));

    const reminderDays =
      newData.reminderDays ??
      (current.reminderDays as number[] | null) ??
      DEFAULT_REMINDER_DAYS;
    const escalationDays =
      newData.escalationDays ?? (current.escalationDays as number[] | null);

    const [newDoc] = await ctx.db
      .insert(complianceDocument)
      .values({
        assignedReviewer: newData.assignedReviewer ?? current.assignedReviewer,
        assignedTo: newData.assignedTo ?? current.assignedTo,
        attachment: newData.attachment ?? current.attachment,
        autoRenewal: newData.autoRenewal ?? current.autoRenewal,
        branch: newData.branch ?? current.branch,
        category: (newData.category ??
          current.category) as ComplianceDocument["category"],
        connection: newData.connection ?? current.connection,
        createdBy: newData.createdBy ?? current.createdBy,
        documentType: newData.documentType ?? current.documentType,
        dueDate: newData.dueDate
          ? newData.dueDate.toISOString().split("T")[0]
          : null,
        escalationDays,
        expiryDate: newData.expiryDate
          ? newData.expiryDate.toISOString().split("T")[0]
          : null,
        issueDate: newData.issueDate
          ? newData.issueDate.toISOString().split("T")[0]
          : null,
        issuingAuthority: newData.issuingAuthority ?? current.issuingAuthority,
        jurisdiction: newData.jurisdiction ?? current.jurisdiction,
        metadata: newData.metadata ?? current.metadata,
        name: newData.name ?? current.name,
        notes: newData.notes ?? current.notes,
        obligationId: current.obligationId,
        periodEnd: newData.periodEnd
          ? newData.periodEnd.toISOString().split("T")[0]
          : null,
        periodStart: newData.periodStart
          ? newData.periodStart.toISOString().split("T")[0]
          : null,
        referenceNumber: newData.referenceNumber ?? null,
        reminderDays,
        renewalDate: newData.renewalDate
          ? newData.renewalDate.toISOString().split("T")[0]
          : null,
        renewalFrequency: newData.renewalFrequency ?? current.renewalFrequency,
        renewedFrom: id,
        sourceEntityId: current.sourceEntityId,
        sourceEntityType: current.sourceEntityType,
        sourceModule: current.sourceModule,
        verificationStatus: "draft",
      })
      .returning();

    if (!newDoc) throw new Error("Database operation returned no result");

    await ctx.audit.write({
      action: "renewed",
      actorId: current.createdBy,
      entityId: newDoc.id,
      entityType: "compliance_document",
      metadata: { newDocumentId: newDoc.id, oldDocumentId: id },
      previousState: { id, verificationStatus: current.verificationStatus },
    });

    await ctx.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_RENEWED, {
      newDocumentId: newDoc.id,
      oldDocumentId: id,
    });

    return { newDocument: newDoc, oldDocument: current };
  },
);

const archiveDocument = Workflow.name("document.archive").handler(
  async (input: { id: string }, ctx) => {
    const { id } = input;
    const current = await ctx.step.run(fetchDocumentStep, { id });

    const [updated] = await ctx.db
      .update(complianceDocument)
      .set({ updatedAt: new Date(), verificationStatus: "archived" })
      .where(eq(complianceDocument.id, id))
      .returning();

    if (!updated) throw new Error("Database operation returned no result");

    await ctx.audit.write({
      action: "archived",
      actorId: current.createdBy,
      entityId: id,
      entityType: "compliance_document",
      previousState: { verificationStatus: current.verificationStatus },
    });

    await ctx.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_ARCHIVED, {
      documentId: id,
    });

    return updated;
  },
);

const snoozeDocument = Workflow.name("document.snooze").handler(
  async (input: { id: string; days: number; snoozedBy: string }, ctx) => {
    const { id, days, snoozedBy } = input;
    const snoozedUntil = new Date();
    snoozedUntil.setDate(snoozedUntil.getDate() + days);

    const [updated] = await ctx.db
      .update(complianceDocument)
      .set({ snoozedUntil, updatedAt: new Date() })
      .where(eq(complianceDocument.id, id))
      .returning();

    if (!updated) throw new Error("Database operation returned no result");

    await ctx.audit.write({
      action: "snoozed",
      actorId: snoozedBy,
      entityId: id,
      entityType: "compliance_document",
      metadata: { snoozedUntil: snoozedUntil.toISOString() },
    });

    await ctx.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_SNOOZED, {
      documentId: id,
      snoozedBy,
      snoozedUntil: snoozedUntil.toISOString(),
    });

    return updated;
  },
);

const listDocuments = Workflow.name("document.list").handler(
  async (input: { filters?: ComplianceDocumentFilters }, ctx) => {
    const filters = input.filters;
    const parsed = filters
      ? parse(ComplianceDocumentFiltersSchema, filters)
      : {};
    const conditions = [];

    if (parsed.category) {
      conditions.push(eq(complianceDocument.category, parsed.category));
    }
    if (parsed.verificationStatus) {
      conditions.push(
        eq(complianceDocument.verificationStatus, parsed.verificationStatus),
      );
    }
    if (parsed.branch) {
      conditions.push(eq(complianceDocument.branch, parsed.branch));
    }
    if (parsed.sourceModule) {
      conditions.push(eq(complianceDocument.sourceModule, parsed.sourceModule));
    }
    if (parsed.sourceEntityType) {
      conditions.push(
        eq(complianceDocument.sourceEntityType, parsed.sourceEntityType),
      );
    }
    if (parsed.sourceEntityId) {
      conditions.push(
        eq(complianceDocument.sourceEntityId, parsed.sourceEntityId),
      );
    }
    if (parsed.reviewer) {
      conditions.push(eq(complianceDocument.assignedReviewer, parsed.reviewer));
    }
    if (parsed.obligationId) {
      conditions.push(eq(complianceDocument.obligationId, parsed.obligationId));
    }
    if (parsed.jurisdiction) {
      conditions.push(eq(complianceDocument.jurisdiction, parsed.jurisdiction));
    }
    if (parsed.expiringWithinDays) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + parsed.expiringWithinDays);
      const futureDateStr = futureDate.toISOString().split("T")[0] as string;
      conditions.push(
        and(
          isNotNull(complianceDocument.expiryDate),
          lte(complianceDocument.expiryDate, futureDateStr),
        ),
      );
    }
    if (parsed.dueWithinDays) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + parsed.dueWithinDays);
      const futureDateStr = futureDate.toISOString().split("T")[0] as string;
      conditions.push(
        and(
          isNotNull(complianceDocument.dueDate),
          lte(complianceDocument.dueDate, futureDateStr),
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return ctx.db
      .select()
      .from(complianceDocument)
      .where(whereClause)
      .orderBy(desc(complianceDocument.updatedAt));
  },
);

const getExpiringDocuments = Workflow.name("document.expiring").handler(
  async (input: { days: number }, ctx) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + input.days);
    const futureDateStr = futureDate.toISOString().split("T")[0] as string;
    const todayStr = new Date().toISOString().split("T")[0] as string;

    return ctx.db
      .select()
      .from(complianceDocument)
      .where(
        and(
          isNotNull(complianceDocument.expiryDate),
          lte(complianceDocument.expiryDate, futureDateStr),
          gte(complianceDocument.expiryDate, todayStr),
          inArray(complianceDocument.verificationStatus, [
            "verified",
            "submitted",
          ]),
        ),
      );
  },
);

const getDueSoonDocuments = Workflow.name("document.due-soon").handler(
  async (input: { days: number }, ctx) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + input.days);
    const futureDateStr = futureDate.toISOString().split("T")[0] as string;
    const todayStr = new Date().toISOString().split("T")[0] as string;

    return ctx.db
      .select()
      .from(complianceDocument)
      .where(
        and(
          isNotNull(complianceDocument.dueDate),
          lte(complianceDocument.dueDate, futureDateStr),
          gte(complianceDocument.dueDate, todayStr),
          isNull(complianceDocument.completedAt),
        ),
      );
  },
);

const getExpiredDocuments = Workflow.name("document.expired").handler(
  async (_input: Record<string, never>, ctx) => {
    const todayStr = new Date().toISOString().split("T")[0] as string;

    return ctx.db
      .select()
      .from(complianceDocument)
      .where(
        and(
          isNotNull(complianceDocument.expiryDate),
          lte(complianceDocument.expiryDate, todayStr),
          inArray(complianceDocument.verificationStatus, [
            "verified",
            "submitted",
            "under_review",
          ]),
        ),
      );
  },
);

const getOverdueDocuments = Workflow.name("document.overdue").handler(
  async (_input: Record<string, never>, ctx) => {
    const todayStr = new Date().toISOString().split("T")[0] as string;

    return ctx.db
      .select()
      .from(complianceDocument)
      .where(
        and(
          isNotNull(complianceDocument.dueDate),
          lte(complianceDocument.dueDate, todayStr),
          isNull(complianceDocument.completedAt),
          inArray(complianceDocument.verificationStatus, [
            "draft",
            "submitted",
            "under_review",
            "verified",
          ]),
        ),
      );
  },
);

const getRenewalChain = Workflow.name("document.renewal-chain").handler(
  async (input: { id: string }, ctx): Promise<RenewalChainEntry[]> => {
    const chain: RenewalChainEntry[] = [];
    let currentId: string | null = input.id;

    while (currentId) {
      const [doc] = await ctx.db
        .select({
          createdAt: complianceDocument.createdAt,
          id: complianceDocument.id,
          name: complianceDocument.name,
          renewedFrom: complianceDocument.renewedFrom,
          verificationStatus: complianceDocument.verificationStatus,
        })
        .from(complianceDocument)
        .where(eq(complianceDocument.id, currentId))
        .limit(1);

      if (!doc) break;

      chain.push({
        createdAt: doc.createdAt.toISOString(),
        id: doc.id,
        name: doc.name,
        renewedFrom: doc.renewedFrom,
        verificationStatus: doc.verificationStatus,
      });

      currentId = doc.renewedFrom;
    }

    return chain;
  },
);

const getDocumentsBySource = Workflow.name("document.by-source").handler(
  async (
    input: {
      sourceModule: string;
      sourceEntityType?: string;
      sourceEntityId?: string;
    },
    ctx,
  ) => {
    const conditions = [
      eq(complianceDocument.sourceModule, input.sourceModule),
    ];

    if (input.sourceEntityType) {
      conditions.push(
        eq(complianceDocument.sourceEntityType, input.sourceEntityType),
      );
    }
    if (input.sourceEntityId) {
      conditions.push(
        eq(complianceDocument.sourceEntityId, input.sourceEntityId),
      );
    }

    return ctx.db
      .select()
      .from(complianceDocument)
      .where(and(...conditions))
      .orderBy(desc(complianceDocument.updatedAt));
  },
);

const getDocumentsByObligation = Workflow.name(
  "document.by-obligation",
).handler(async (input: { obligationId: string }, ctx) => {
  return ctx.db
    .select()
    .from(complianceDocument)
    .where(eq(complianceDocument.obligationId, input.obligationId))
    .orderBy(asc(complianceDocument.periodStart));
});

const getDocumentTimeline = Workflow.name("document.timeline").handler(
  async (input: { days: number }, ctx): Promise<TimelineEntry[]> => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + input.days);
    const futureDateStr = futureDate.toISOString().split("T")[0] as string;

    const docs = await ctx.db
      .select()
      .from(complianceDocument)
      .where(
        and(
          inArray(complianceDocument.verificationStatus, [
            "verified",
            "submitted",
            "under_review",
            "draft",
          ]),
          or(
            and(
              isNotNull(complianceDocument.expiryDate),
              lte(complianceDocument.expiryDate, futureDateStr),
            ),
            and(
              isNotNull(complianceDocument.dueDate),
              lte(complianceDocument.dueDate, futureDateStr),
            ),
          ),
        ),
      )
      .orderBy(asc(complianceDocument.expiryDate));

    return docs.map((doc) => {
      const targetDate = doc.expiryDate ?? doc.dueDate;
      const daysRemaining = targetDate ? (daysUntil(targetDate) ?? 0) : 0;
      return {
        assignedReviewer: doc.assignedReviewer,
        assignedTo: doc.assignedTo,
        category: doc.category,
        daysRemaining,
        documentType: doc.documentType,
        expiryDate: doc.expiryDate,
        id: doc.id,
        isObligationGenerated: doc.obligationId !== null,
        name: doc.name,
        remindersSent: doc.lastNotifiedAt !== null,
        sourceModule: doc.sourceModule,
        verificationStatus: doc.verificationStatus,
      };
    });
  },
);

const updateDocumentStatus = Workflow.name("document.update-status").handler(
  async (
    input: {
      id: string;
      status: VerificationStatus;
      performedBy: string | null | undefined;
    },
    ctx,
  ): Promise<ComplianceDocument> => {
    const { id, status, performedBy } = input;
    const current = await ctx.step.run(fetchDocumentStep, { id });

    const [updated] = await ctx.db
      .update(complianceDocument)
      .set({ updatedAt: new Date(), verificationStatus: status })
      .where(eq(complianceDocument.id, id))
      .returning();

    if (!updated) throw new Error("Database operation returned no result");

    const action: AuditAction =
      status === "expired"
        ? "expired"
        : status === "overdue"
          ? "overdue"
          : "updated";

    await ctx.audit.write({
      action,
      actorId: performedBy ?? undefined,
      entityId: id,
      entityType: "compliance_document",
      previousState: { verificationStatus: current.verificationStatus },
    });

    return updated;
  },
);

const updateDocumentNotifiedAt = Workflow.name(
  "document.update-notified-at",
).handler(async (input: { id: string }, ctx): Promise<void> => {
  await ctx.db
    .update(complianceDocument)
    .set({ lastNotifiedAt: new Date(), updatedAt: new Date() })
    .where(eq(complianceDocument.id, input.id));
});

const updateDocumentEscalatedAt = Workflow.name(
  "document.update-escalated-at",
).handler(async (input: { id: string }, ctx): Promise<void> => {
  await ctx.db
    .update(complianceDocument)
    .set({ lastEscalatedAt: new Date(), updatedAt: new Date() })
    .where(eq(complianceDocument.id, input.id));
});

const getActiveDocumentsForReminders = Workflow.name(
  "document.active-for-reminders",
).handler(async (_input: Record<string, never>, ctx) => {
  return ctx.db
    .select()
    .from(complianceDocument)
    .where(
      and(
        inArray(complianceDocument.verificationStatus, [
          "verified",
          "submitted",
          "under_review",
          "draft",
        ]),
        or(
          isNotNull(complianceDocument.expiryDate),
          isNotNull(complianceDocument.dueDate),
        ),
      ),
    );
});

const getExpiredAndOverdueDocuments = Workflow.name(
  "document.expired-and-overdue",
).handler(async (_input: Record<string, never>, ctx) => {
  return ctx.db
    .select()
    .from(complianceDocument)
    .where(
      inArray(complianceDocument.verificationStatus, [
        "verified",
        "submitted",
        "under_review",
        "draft",
      ]),
    );
});

const getEscalatableDocuments = Workflow.name("document.escalatable").handler(
  async (_input: Record<string, never>, ctx) => {
    return ctx.db
      .select()
      .from(complianceDocument)
      .where(
        inArray(complianceDocument.verificationStatus, ["expired", "overdue"]),
      );
  },
);

export const documents = {
  archive: archiveDocument,
  assignReviewer: assignDocumentReviewer,
  assignTo: assignDocumentTo,
  complete: completeDocument,
  create: createDocument,
  get: getDocumentById,
  getActiveDocumentsForReminders,
  getByObligation: getDocumentsByObligation,
  getBySource: getDocumentsBySource,
  getDueSoonDocuments,
  getEscalatableDocuments,
  getExpiredAndOverdueDocuments,
  getExpiredDocuments,
  getExpiringDocuments,
  getOverdueDocuments,
  getRenewalChain,
  getTimeline: getDocumentTimeline,
  list: listDocuments,
  markRenewalInProgress,
  reject: rejectDocument,
  renew: renewDocument,
  snooze: snoozeDocument,
  submit: submitDocument,
  update: updateDocument,
  updateEscalatedAt: updateDocumentEscalatedAt,
  updateNotifiedAt: updateDocumentNotifiedAt,
  updateStatus: updateDocumentStatus,
  uploadAttachment: uploadDocumentAttachment,
  verify: verifyDocument,
} as const;
