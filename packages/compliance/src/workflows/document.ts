import type { PubSubUnit } from "@aspen-os/framework/server";
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
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import type { AuditAction, VerificationStatus } from "../constants";
import { type ComplianceDocument, complianceDocument } from "../db-schema";
import { COMPLIANCE_EVENTS } from "../event-map";
import { AuditWriter } from "../services/audit-writer";
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

export class DocumentWorkflow {
  private auditWriter: AuditWriter;

  constructor(
    private readonly db: NodePgDatabase,
    private readonly pubsub: PubSubUnit,
  ) {
    this.auditWriter = new AuditWriter(db);
  }

  async create(input: CreateComplianceDocumentInput) {
    const parsed = parse(CreateComplianceDocumentSchema, input);

    const reminderDays = parsed.reminderDays ?? DEFAULT_REMINDER_DAYS;

    const [result] = await this.db
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

    await this.auditWriter.write({
      action: "created",
      entityId: result.id,
      entityType: "compliance_document",
      newState: result as unknown as Record<string, unknown>,
      performedBy: parsed.createdBy,
    });

    await this.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_CREATED, {
      document: {
        category: result.category,
        id: result.id,
        name: result.name,
      },
    });

    return result;
  }

  async update(id: string, patch: UpdateComplianceDocumentInput) {
    const current = await this.getById(id);
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

    const [updated] = await this.db
      .update(complianceDocument)
      .set(updateData)
      .where(eq(complianceDocument.id, id))
      .returning();

    if (!updated) throw new Error("Database operation returned no result");

    const changes: Record<string, { new: unknown; old: unknown }> = {};
    for (const key of Object.keys(updateData)) {
      if (key === "updatedAt") continue;
      const oldVal = (current as unknown as Record<string, unknown>)[key];
      const newVal = (updated as unknown as Record<string, unknown>)[key];
      if (oldVal !== newVal) {
        changes[key] = { new: newVal, old: oldVal };
      }
    }

    await this.auditWriter.write({
      action: "updated",
      changes,
      entityId: id,
      entityType: "compliance_document",
      newState: updated as unknown as Record<string, unknown>,
      performedBy: current.createdBy,
      previousState: current as unknown as Record<string, unknown>,
    });

    await this.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_UPDATED, {
      changes,
      document: { id: updated.id, name: updated.name },
    });

    return updated;
  }

  async uploadAttachment(id: string, storageKey: string) {
    const current = await this.getById(id);

    const [updated] = await this.db
      .update(complianceDocument)
      .set({ attachment: storageKey, updatedAt: new Date() })
      .where(eq(complianceDocument.id, id))
      .returning();

    if (!updated) throw new Error("Database operation returned no result");

    await this.auditWriter.write({
      action: "attachment_uploaded",
      entityId: id,
      entityType: "compliance_document",
      metadata: { storageKey },
      performedBy: current.createdBy,
    });

    await this.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_ATTACHMENT_UPLOADED, {
      documentId: id,
      storageKey,
    });

    return updated;
  }

  async submit(id: string) {
    const current = await this.getById(id);

    if (
      current.verificationStatus !== "draft" &&
      current.verificationStatus !== "rejected"
    ) {
      throw new Error(
        `Cannot submit document in status "${current.verificationStatus}"`,
      );
    }

    const [updated] = await this.db
      .update(complianceDocument)
      .set({ updatedAt: new Date(), verificationStatus: "submitted" })
      .where(eq(complianceDocument.id, id))
      .returning();

    if (!updated) throw new Error("Database operation returned no result");

    await this.auditWriter.write({
      action: "submitted",
      entityId: id,
      entityType: "compliance_document",
      performedBy: current.createdBy,
      previousState: { verificationStatus: current.verificationStatus },
    });

    await this.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_SUBMITTED, {
      documentId: id,
      submittedBy: current.createdBy,
    });

    return updated;
  }

  async assignReviewer(id: string, userId: string) {
    const current = await this.getById(id);

    const newStatus: VerificationStatus =
      current.verificationStatus === "submitted" ||
      current.verificationStatus === "rejected"
        ? "under_review"
        : current.verificationStatus;

    const [updated] = await this.db
      .update(complianceDocument)
      .set({
        assignedReviewer: userId,
        updatedAt: new Date(),
        verificationStatus: newStatus,
      })
      .where(eq(complianceDocument.id, id))
      .returning();

    if (!updated) throw new Error("Database operation returned no result");

    await this.auditWriter.write({
      action: "reviewer_assigned",
      entityId: id,
      entityType: "compliance_document",
      metadata: { reviewerId: userId },
      performedBy: userId,
      previousState: {
        assignedReviewer: current.assignedReviewer,
        verificationStatus: current.verificationStatus,
      },
    });

    await this.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_REVIEWER_ASSIGNED, {
      documentId: id,
      reviewerId: userId,
    });

    return updated;
  }

  async assignTo(id: string, userId: string) {
    const current = await this.getById(id);

    const [updated] = await this.db
      .update(complianceDocument)
      .set({ assignedTo: userId, updatedAt: new Date() })
      .where(eq(complianceDocument.id, id))
      .returning();

    if (!updated) throw new Error("Database operation returned no result");

    await this.auditWriter.write({
      action: "updated",
      entityId: id,
      entityType: "compliance_document",
      metadata: { assigneeId: userId },
      performedBy: current.createdBy,
      previousState: { assignedTo: current.assignedTo },
    });

    return updated;
  }

  async verify(id: string, reviewerId: string) {
    const current = await this.getById(id);

    if (current.verificationStatus !== "under_review") {
      throw new Error(
        `Cannot verify document in status "${current.verificationStatus}"`,
      );
    }

    const now = new Date();
    const [updated] = await this.db
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

    await this.auditWriter.write({
      action: "verified",
      entityId: id,
      entityType: "compliance_document",
      performedBy: reviewerId,
      previousState: { verificationStatus: current.verificationStatus },
    });

    await this.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_VERIFIED, {
      category: updated.category,
      documentId: id,
      sourceEntityId: updated.sourceEntityId,
      sourceModule: updated.sourceModule,
      verifiedBy: reviewerId,
    });

    return updated;
  }

  async reject(id: string, reviewerId: string, reason: string) {
    const current = await this.getById(id);

    if (current.verificationStatus !== "under_review") {
      throw new Error(
        `Cannot reject document in status "${current.verificationStatus}"`,
      );
    }

    const [updated] = await this.db
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

    await this.auditWriter.write({
      action: "rejected",
      entityId: id,
      entityType: "compliance_document",
      notes: reason,
      performedBy: reviewerId,
      previousState: { verificationStatus: current.verificationStatus },
    });

    await this.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_REJECTED, {
      category: updated.category,
      documentId: id,
      reason,
      rejectedBy: reviewerId,
      sourceEntityId: updated.sourceEntityId,
      sourceModule: updated.sourceModule,
    });

    return updated;
  }

  async complete(
    id: string,
    data: {
      completedAt?: Date;
      referenceNumber?: string;
      attachmentKey?: string;
    },
  ) {
    const current = await this.getById(id);
    const completedAt = data.completedAt ?? new Date();

    const [updated] = await this.db
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

    await this.auditWriter.write({
      action: "completed",
      entityId: id,
      entityType: "compliance_document",
      metadata: {
        completedAt: completedAt.toISOString(),
        referenceNumber: data.referenceNumber ?? null,
      },
      performedBy: current.createdBy,
    });

    await this.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_COMPLETED, {
      completedAt: completedAt.toISOString(),
      documentId: id,
      referenceNumber: data.referenceNumber ?? null,
      sourceEntityId: updated.sourceEntityId,
      sourceModule: updated.sourceModule,
    });

    return updated;
  }

  async markRenewalInProgress(id: string) {
    const current = await this.getById(id);

    const [updated] = await this.db
      .update(complianceDocument)
      .set({ updatedAt: new Date(), verificationStatus: "submitted" })
      .where(eq(complianceDocument.id, id))
      .returning();

    if (!updated) throw new Error("Database operation returned no result");

    await this.auditWriter.write({
      action: "updated",
      entityId: id,
      entityType: "compliance_document",
      notes: "Renewal in progress",
      performedBy: current.createdBy,
      previousState: { verificationStatus: current.verificationStatus },
    });

    return updated;
  }

  async renew(id: string, newData: Partial<CreateComplianceDocumentInput>) {
    const current = await this.getById(id);

    await this.db
      .update(complianceDocument)
      .set({ updatedAt: new Date(), verificationStatus: "renewed" })
      .where(eq(complianceDocument.id, id));

    const reminderDays =
      newData.reminderDays ??
      (current.reminderDays as number[] | null) ??
      DEFAULT_REMINDER_DAYS;
    const escalationDays =
      newData.escalationDays ?? (current.escalationDays as number[] | null);

    const [newDoc] = await this.db
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

    await this.auditWriter.write({
      action: "renewed",
      entityId: newDoc.id,
      entityType: "compliance_document",
      metadata: { newDocumentId: newDoc.id, oldDocumentId: id },
      performedBy: current.createdBy,
      previousState: { id, verificationStatus: current.verificationStatus },
    });

    await this.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_RENEWED, {
      newDocumentId: newDoc.id,
      oldDocumentId: id,
    });

    return { newDocument: newDoc, oldDocument: current };
  }

  async archive(id: string) {
    const current = await this.getById(id);

    const [updated] = await this.db
      .update(complianceDocument)
      .set({ updatedAt: new Date(), verificationStatus: "archived" })
      .where(eq(complianceDocument.id, id))
      .returning();

    if (!updated) throw new Error("Database operation returned no result");

    await this.auditWriter.write({
      action: "archived",
      entityId: id,
      entityType: "compliance_document",
      performedBy: current.createdBy,
      previousState: { verificationStatus: current.verificationStatus },
    });

    await this.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_ARCHIVED, {
      documentId: id,
    });

    return updated;
  }

  async snooze(id: string, days: number, snoozedBy: string) {
    const snoozedUntil = new Date();
    snoozedUntil.setDate(snoozedUntil.getDate() + days);

    const [updated] = await this.db
      .update(complianceDocument)
      .set({ snoozedUntil, updatedAt: new Date() })
      .where(eq(complianceDocument.id, id))
      .returning();

    if (!updated) throw new Error("Database operation returned no result");

    await this.auditWriter.write({
      action: "snoozed",
      entityId: id,
      entityType: "compliance_document",
      metadata: { snoozedUntil: snoozedUntil.toISOString() },
      performedBy: snoozedBy,
    });

    await this.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_SNOOZED, {
      documentId: id,
      snoozedBy,
      snoozedUntil: snoozedUntil.toISOString(),
    });

    return updated;
  }

  async getById(id: string): Promise<ComplianceDocument> {
    const [result] = await this.db
      .select()
      .from(complianceDocument)
      .where(eq(complianceDocument.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Compliance document with id "${id}" not found.`);
    }

    return result;
  }

  async list(filters?: ComplianceDocumentFilters) {
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

    return this.db
      .select()
      .from(complianceDocument)
      .where(whereClause)
      .orderBy(desc(complianceDocument.updatedAt));
  }

  async getExpiring(days: number) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    const futureDateStr = futureDate.toISOString().split("T")[0] as string;
    const todayStr = new Date().toISOString().split("T")[0] as string;

    return this.db
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
  }

  async getDueSoon(days: number) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    const futureDateStr = futureDate.toISOString().split("T")[0] as string;
    const todayStr = new Date().toISOString().split("T")[0] as string;

    return this.db
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
  }

  async getExpired() {
    const todayStr = new Date().toISOString().split("T")[0] as string;

    return this.db
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
  }

  async getOverdue() {
    const todayStr = new Date().toISOString().split("T")[0] as string;

    return this.db
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
  }

  async getRenewalChain(id: string): Promise<RenewalChainEntry[]> {
    const chain: RenewalChainEntry[] = [];
    let currentId: string | null = id;

    while (currentId) {
      const [doc] = await this.db
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
  }

  async getBySource(
    sourceModule: string,
    sourceEntityType?: string,
    sourceEntityId?: string,
  ) {
    const conditions = [eq(complianceDocument.sourceModule, sourceModule)];

    if (sourceEntityType) {
      conditions.push(
        eq(complianceDocument.sourceEntityType, sourceEntityType),
      );
    }
    if (sourceEntityId) {
      conditions.push(eq(complianceDocument.sourceEntityId, sourceEntityId));
    }

    return this.db
      .select()
      .from(complianceDocument)
      .where(and(...conditions))
      .orderBy(desc(complianceDocument.updatedAt));
  }

  async getByObligation(obligationId: string) {
    return this.db
      .select()
      .from(complianceDocument)
      .where(eq(complianceDocument.obligationId, obligationId))
      .orderBy(asc(complianceDocument.periodStart));
  }

  async getTimeline(days: number): Promise<TimelineEntry[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    const futureDateStr = futureDate.toISOString().split("T")[0] as string;

    const docs = await this.db
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
  }

  async updateStatus(
    id: string,
    status: VerificationStatus,
    performedBy?: string | null,
  ): Promise<ComplianceDocument> {
    const current = await this.getById(id);

    const [updated] = await this.db
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

    await this.auditWriter.write({
      action,
      entityId: id,
      entityType: "compliance_document",
      performedBy: performedBy ?? null,
      previousState: { verificationStatus: current.verificationStatus },
    });

    return updated;
  }

  async updateNotifiedAt(id: string): Promise<void> {
    await this.db
      .update(complianceDocument)
      .set({ lastNotifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(complianceDocument.id, id));
  }

  async updateEscalatedAt(id: string): Promise<void> {
    await this.db
      .update(complianceDocument)
      .set({ lastEscalatedAt: new Date(), updatedAt: new Date() })
      .where(eq(complianceDocument.id, id));
  }

  async getActiveDocumentsForReminders() {
    return this.db
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
  }

  async getExpiredAndOverdueDocuments() {
    return this.db
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
  }

  async getEscalatableDocuments() {
    return this.db
      .select()
      .from(complianceDocument)
      .where(
        inArray(complianceDocument.verificationStatus, ["expired", "overdue"]),
      );
  }
}
