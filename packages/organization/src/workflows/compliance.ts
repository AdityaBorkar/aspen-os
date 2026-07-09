import type { PubSubUnit } from "@aspen-os/framework/server";
import { and, desc, eq, gte, isNotNull, lte, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import { complianceDocument } from "../db-schema";
import { COMPLIANCE_EVENTS } from "../event-map";
import type {
  ComplianceCategory,
  ComplianceFilters,
  ComplianceStatus,
  ComplianceSummary,
  CreateComplianceDocumentInput,
  UpdateComplianceDocumentInput,
} from "../types";
import {
  ComplianceFiltersSchema,
  CreateComplianceDocumentSchema,
  UpdateComplianceDocumentSchema,
} from "../types";

const DEFAULT_REMINDER_DAYS = [90, 60, 30, 7];
const DEFAULT_FIRST_THRESHOLD = 90;

export class ComplianceWorkflow {
  constructor(
    private readonly db: NodePgDatabase,
    private readonly pubsub: PubSubUnit,
  ) {}

  async create(input: CreateComplianceDocumentInput) {
    const parsed = parse(CreateComplianceDocumentSchema, input);

    const reminderDays = parsed.reminderDays ?? DEFAULT_REMINDER_DAYS;
    const status = this.deriveStatus(
      parsed.expiryDate ?? null,
      reminderDays,
      "active",
    );

    const [result] = await this.db
      .insert(complianceDocument)
      .values({
        attachment: parsed.attachment ?? null,
        autoRenewal: parsed.autoRenewal ?? false,
        branch: parsed.branch ?? null,
        category: parsed.category,
        connection: parsed.connection ?? null,
        createdBy: parsed.createdBy,
        documentNumber: parsed.documentNumber ?? null,
        expiryDate: parsed.expiryDate?.toISOString().split("T")[0] ?? null,
        issueDate: parsed.issueDate ?? null,
        issuingAuthority: parsed.issuingAuthority ?? null,
        name: parsed.name,
        notes: parsed.notes ?? null,
        reminderDays,
        renewalDate: parsed.renewalDate?.toISOString().split("T")[0] ?? null,
        renewalFrequency: parsed.renewalFrequency ?? null,
        status,
      })
      .returning();

    return result;
  }

  async update(id: string, patch: UpdateComplianceDocumentInput) {
    const current = await this.getById(id);
    const parsed = parse(UpdateComplianceDocumentSchema, patch);

    const reminderDays =
      parsed.reminderDays ?? current.reminderDays ?? DEFAULT_REMINDER_DAYS;
    const expiryDate = parsed.expiryDate
      ? parsed.expiryDate.toISOString().split("T")[0]
      : current.expiryDate;

    const status = this.deriveStatus(
      expiryDate ? new Date(expiryDate) : null,
      reminderDays,
      current.status as ComplianceStatus,
    );

    const [updated] = await this.db
      .update(complianceDocument)
      .set({
        attachment: parsed.attachment,
        autoRenewal: parsed.autoRenewal,
        branch: parsed.branch,
        category: parsed.category,
        connection: parsed.connection,
        documentNumber: parsed.documentNumber,
        expiryDate: expiryDate ?? undefined,
        issueDate: parsed.issueDate,
        issuingAuthority: parsed.issuingAuthority,
        name: parsed.name,
        notes: parsed.notes,
        reminderDays,
        renewalDate:
          parsed.renewalDate?.toISOString().split("T")[0] ?? undefined,
        renewalFrequency: parsed.renewalFrequency,
        status,
        updatedAt: new Date(),
      })
      .where(eq(complianceDocument.id, id))
      .returning();

    return updated;
  }

  async uploadAttachment(id: string, storageKey: string) {
    await this.getById(id);

    const [updated] = await this.db
      .update(complianceDocument)
      .set({ attachment: storageKey, updatedAt: new Date() })
      .where(eq(complianceDocument.id, id))
      .returning();

    return updated;
  }

  async markRenewalInProgress(id: string) {
    const [updated] = await this.db
      .update(complianceDocument)
      .set({ status: "renewal_in_progress", updatedAt: new Date() })
      .where(eq(complianceDocument.id, id))
      .returning();

    return updated;
  }

  async renew(id: string, newData: Partial<CreateComplianceDocumentInput>) {
    const current = await this.getById(id);

    await this.db
      .update(complianceDocument)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(complianceDocument.id, id));

    const reminderDays =
      newData.reminderDays ?? current.reminderDays ?? DEFAULT_REMINDER_DAYS;
    const expiryDate = newData.expiryDate ?? null;
    const status = this.deriveStatus(expiryDate, reminderDays, "active");

    const [newDoc] = await this.db
      .insert(complianceDocument)
      .values({
        attachment: newData.attachment ?? current.attachment,
        autoRenewal: newData.autoRenewal ?? current.autoRenewal ?? false,
        branch: newData.branch ?? current.branch,
        category: (newData.category ?? current.category) as ComplianceCategory,
        connection: newData.connection ?? current.connection,
        createdBy: newData.createdBy ?? current.createdBy,
        documentNumber: newData.documentNumber ?? current.documentNumber,
        expiryDate: expiryDate?.toISOString().split("T")[0] ?? null,
        issueDate: newData.issueDate ?? current.issueDate,
        issuingAuthority: newData.issuingAuthority ?? current.issuingAuthority,
        name: newData.name ?? current.name,
        notes: newData.notes ?? current.notes,
        reminderDays,
        renewalDate: newData.renewalDate?.toISOString().split("T")[0] ?? null,
        renewalFrequency: newData.renewalFrequency ?? current.renewalFrequency,
        renewedFrom: id,
        status,
      })
      .returning();

    return { newDocument: newDoc, oldDocument: current };
  }

  async archive(id: string) {
    const [updated] = await this.db
      .update(complianceDocument)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(complianceDocument.id, id))
      .returning();

    return updated;
  }

  async list(filters?: ComplianceFilters) {
    const parsed = filters ? parse(ComplianceFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.category) {
      conditions.push(eq(complianceDocument.category, parsed.category));
    }
    if (parsed.status) {
      conditions.push(eq(complianceDocument.status, parsed.status));
    }
    if (parsed.branch) {
      conditions.push(eq(complianceDocument.branch, parsed.branch));
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

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db
      .select()
      .from(complianceDocument)
      .where(whereClause)
      .orderBy(desc(complianceDocument.expiryDate));
  }

  async getById(id: string) {
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
          eq(complianceDocument.status, "active"),
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
          eq(complianceDocument.status, "expiring_soon"),
        ),
      );
  }

  async getSummary(branchFilter?: string): Promise<ComplianceSummary> {
    const conditions = [];
    if (branchFilter) {
      conditions.push(eq(complianceDocument.branch, branchFilter));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [counts] = await this.db
      .select({
        active: sql<number>`count(*) filter (where ${complianceDocument.status} = 'active')::int`,
        expired: sql<number>`count(*) filter (where ${complianceDocument.status} = 'expired')::int`,
        expiringSoon: sql<number>`count(*) filter (where ${complianceDocument.status} = 'expiring_soon')::int`,
        renewalInProgress: sql<number>`count(*) filter (where ${complianceDocument.status} = 'renewal_in_progress')::int`,
        total: sql<number>`count(*)::int`,
      })
      .from(complianceDocument)
      .where(whereClause);

    const categoryRows = await this.db
      .select({
        category: complianceDocument.category,
        count: sql<number>`count(*)::int`,
      })
      .from(complianceDocument)
      .where(whereClause)
      .groupBy(complianceDocument.category);

    const byCategory: Record<string, number> = {};
    for (const row of categoryRows) {
      byCategory[row.category] = row.count;
    }

    return {
      active: counts?.active ?? 0,
      byCategory,
      expired: counts?.expired ?? 0,
      expiringSoon: counts?.expiringSoon ?? 0,
      renewalInProgress: counts?.renewalInProgress ?? 0,
      total: counts?.total ?? 0,
    };
  }

  async transitionExpiredDocuments(): Promise<string[]> {
    const todayStr = new Date().toISOString().split("T")[0] as string;
    const expired = await this.db
      .update(complianceDocument)
      .set({ status: "expired", updatedAt: new Date() })
      .where(
        and(
          isNotNull(complianceDocument.expiryDate),
          lte(complianceDocument.expiryDate, todayStr),
          eq(complianceDocument.status, "expiring_soon"),
        ),
      )
      .returning({ id: complianceDocument.id });

    return expired.map((d) => d.id);
  }

  async notifyExpiringDocuments(): Promise<string[]> {
    const now = new Date();

    const docs = await this.db
      .select()
      .from(complianceDocument)
      .where(
        and(
          isNotNull(complianceDocument.expiryDate),
          eq(complianceDocument.status, "expiring_soon"),
        ),
      );

    const notifiedIds: string[] = [];

    for (const doc of docs) {
      if (!doc.expiryDate) continue;

      const expiryDate = new Date(doc.expiryDate);
      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      const reminderDays = doc.reminderDays ?? DEFAULT_REMINDER_DAYS;
      const shouldNotify = reminderDays.some(
        (threshold) => daysUntilExpiry <= threshold,
      );

      if (shouldNotify) {
        await this.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_EXPIRING, {
          daysUntilExpiry,
          document: {
            expiryDate: doc.expiryDate,
            id: doc.id,
            name: doc.name,
          },
        });

        await this.db
          .update(complianceDocument)
          .set({ lastNotifiedAt: now })
          .where(eq(complianceDocument.id, doc.id));

        notifiedIds.push(doc.id);
      }
    }

    return notifiedIds;
  }

  private deriveStatus(
    expiryDate: Date | null,
    reminderDays: number[],
    currentStatus: ComplianceStatus,
  ): ComplianceStatus {
    if (currentStatus === "archived") return "archived";
    if (currentStatus === "renewal_in_progress") return "renewal_in_progress";
    if (!expiryDate) return "active";

    const now = new Date();
    const daysUntilExpiry = Math.ceil(
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilExpiry <= 0) return "expired";

    const sortedThresholds = [...reminderDays].sort((a, b) => b - a);
    const firstThreshold =
      sortedThresholds[0] ??
      DEFAULT_REMINDER_DAYS[0] ??
      DEFAULT_FIRST_THRESHOLD;

    if (daysUntilExpiry <= firstThreshold) return "expiring_soon";

    return "active";
  }
}
