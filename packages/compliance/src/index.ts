import type {
  DatabaseUnit,
  KvStoreUnit,
  Module,
  ModuleInfra,
  PubSubUnit,
} from "@aspen-os/platform/server";

import { control_plane_schemas, tenant_schemas } from "./db-schemas";
import { events } from "./pubsub-events";
import {
  registerEventBridgeSubscriptions,
  unregisterEventBridge,
} from "./services/event-bridge";
import {
  registerObligationGenerator,
  unregisterObligationGenerator,
} from "./services/obligation-generator";
import {
  type ReminderEngineDeps,
  registerReminderHandlers,
  registerReminderSchedules,
  unregisterReminderEngine,
} from "./services/reminder-engine";
import { acl } from "./utils/acl";
import {
  type AuditDeps,
  exportAuditEntries,
  getAuditTrail,
  listAuditEntries,
} from "./workflows/audit";
import {
  type DashboardDeps,
  getDashboardSummary,
  invalidateDashboardCache,
} from "./workflows/dashboard";
import {
  archiveDocument,
  assignDocumentReviewer,
  assignDocumentTo,
  completeDocument,
  createDocument,
  type DocumentDeps,
  getActiveDocumentsForReminders,
  getDocumentById,
  getDocumentsByObligation,
  getDocumentsBySource,
  getDocumentTimeline,
  getDueSoonDocuments,
  getEscalatableDocuments,
  getExpiredAndOverdueDocuments,
  getExpiredDocuments,
  getExpiringDocuments,
  getOverdueDocuments,
  getRenewalChain,
  listDocuments,
  markRenewalInProgress,
  rejectDocument,
  renewDocument,
  snoozeDocument,
  submitDocument,
  updateDocument,
  updateDocumentEscalatedAt,
  updateDocumentNotifiedAt,
  updateDocumentStatus,
  uploadDocumentAttachment,
  verifyDocument,
} from "./workflows/document";
import {
  activateObligation,
  createObligation,
  deactivateObligation,
  getActiveObligations,
  getObligationById,
  getUpcomingPeriods,
  listObligations,
  type ObligationDeps,
  updateObligation,
} from "./workflows/obligation";
import {
  createVerificationRule,
  deleteVerificationRule,
  getVerificationRuleById,
  listVerificationRules,
  matchVerificationRule,
  updateVerificationRule,
  type VerificationDeps,
} from "./workflows/verification";

export * from "./types";

export type ComplianceModuleConfig = {
  country: "INDIA";
  dashboardCacheTtl?: number;
  defaultEscalationDays?: number[];
  defaultReminderDays?: number[];
};

export class Compliance implements Module {
  static create(config: ComplianceModuleConfig): Compliance {
    return new Compliance(config);
  }

  readonly $name = "compliance";
  readonly $dependencies: readonly string[] = [];
  readonly $config: ComplianceModuleConfig;

  #db: DatabaseUnit | null = null;
  #pubsub: PubSubUnit | null = null;
  #kvStore: KvStoreUnit | null = null;
  #reminderTopics: string[] = [];
  #obligationGenTopic: string | null = null;
  #eventBridgeTopics: string[] = [];

  constructor(config: ComplianceModuleConfig) {
    this.$config = config;
  }

  $prepareInfra(): ModuleInfra {
    return {
      auth: { acl },
      db: { control_plane_schemas, tenant_schemas },
      events,
    };
  }

  $initialize(units: {
    db: DatabaseUnit;
    kvStore: KvStoreUnit;
    pubsub: PubSubUnit;
  }): void {
    this.#db = units.db;
    this.#pubsub = units.pubsub;
    this.#kvStore = units.kvStore;
  }

  async $prepareRuntime(): Promise<void> {
    if (!this.#db || !this.#pubsub || !this.#kvStore) return;

    const documentDeps: DocumentDeps = {
      db: this.#db.db,
      pubsub: this.#pubsub,
    };
    const obligationDeps: ObligationDeps = {
      db: this.#db.db,
      pubsub: this.#pubsub,
    };
    const dashboardDeps: DashboardDeps = {
      cacheTtl: this.$config.dashboardCacheTtl ?? 300,
      db: this.#db.db,
      kvStore: this.#kvStore,
    };
    const reminderEngineDeps: ReminderEngineDeps = {
      dashboardDeps,
      db: this.#db.db,
      documentDeps,
      pubsub: this.#pubsub,
    };
    const obligationGeneratorDeps = {
      db: this.#db.db,
      obligationDeps,
      pubsub: this.#pubsub,
    };
    const eventBridgeDeps = {
      documentDeps,
      obligationDeps,
      pubsub: this.#pubsub,
    };

    await registerReminderSchedules({ pubsub: this.#pubsub });
    this.#reminderTopics = await registerReminderHandlers(reminderEngineDeps);

    this.#obligationGenTopic = await registerObligationGenerator(
      obligationGeneratorDeps,
    );

    this.#eventBridgeTopics =
      await registerEventBridgeSubscriptions(eventBridgeDeps);
  }

  async $cleanup(): Promise<void> {
    if (this.#pubsub) {
      await unregisterReminderEngine(this.#reminderTopics, {
        pubsub: this.#pubsub,
      });
      if (this.#obligationGenTopic) {
        await unregisterObligationGenerator(this.#obligationGenTopic, {
          pubsub: this.#pubsub,
        });
      }
      await unregisterEventBridge(this.#eventBridgeTopics, {
        pubsub: this.#pubsub,
      });
    }
    this.#reminderTopics = [];
    this.#obligationGenTopic = null;
    this.#eventBridgeTopics = [];
    this.#db = null;
    this.#pubsub = null;
    this.#kvStore = null;
  }

  get _() {
    if (!this.#db || !this.#pubsub || !this.#kvStore)
      throw new Error("Compliance not initialized");

    const documentDeps: DocumentDeps = {
      db: this.#db.db,
      pubsub: this.#pubsub,
    };
    const obligationDeps: ObligationDeps = {
      db: this.#db.db,
      pubsub: this.#pubsub,
    };
    const verificationDeps: VerificationDeps = {
      db: this.#db.db,
    };
    const auditDeps: AuditDeps = {
      db: this.#db.db,
    };
    const dashboardDeps: DashboardDeps = {
      cacheTtl: this.$config.dashboardCacheTtl ?? 300,
      db: this.#db.db,
      kvStore: this.#kvStore,
    };

    return {
      audit: {
        export: (filters: Parameters<typeof exportAuditEntries>[0]) =>
          exportAuditEntries(filters, auditDeps),
        getAuditTrail: (
          entityType: Parameters<typeof getAuditTrail>[0],
          entityId: Parameters<typeof getAuditTrail>[1],
        ) => getAuditTrail(entityType, entityId, auditDeps),
        list: (filters: Parameters<typeof listAuditEntries>[0]) =>
          listAuditEntries(filters, auditDeps),
      },
      dashboard: {
        getSummary: (branchFilter: Parameters<typeof getDashboardSummary>[0]) =>
          getDashboardSummary(branchFilter, dashboardDeps),
        invalidateCache: () => invalidateDashboardCache(dashboardDeps),
      },
      documents: {
        archive: (input: Parameters<typeof archiveDocument>[0]) =>
          archiveDocument(input, documentDeps),
        assignReviewer: (
          id: Parameters<typeof assignDocumentReviewer>[0],
          userId: Parameters<typeof assignDocumentReviewer>[1],
        ) => assignDocumentReviewer(id, userId, documentDeps),
        assignTo: (
          id: Parameters<typeof assignDocumentTo>[0],
          userId: Parameters<typeof assignDocumentTo>[1],
        ) => assignDocumentTo(id, userId, documentDeps),
        complete: (
          id: Parameters<typeof completeDocument>[0],
          data: Parameters<typeof completeDocument>[1],
        ) => completeDocument(id, data, documentDeps),
        create: (input: Parameters<typeof createDocument>[0]) =>
          createDocument(input, documentDeps),
        getActiveDocumentsForReminders: () =>
          getActiveDocumentsForReminders(documentDeps),
        getById: (id: Parameters<typeof getDocumentById>[0]) =>
          getDocumentById(id, documentDeps),
        getByObligation: (id: Parameters<typeof getDocumentsByObligation>[0]) =>
          getDocumentsByObligation(id, documentDeps),
        getBySource: (
          sourceModule: Parameters<typeof getDocumentsBySource>[0],
          sourceEntityType: Parameters<typeof getDocumentsBySource>[1],
          sourceEntityId: Parameters<typeof getDocumentsBySource>[2],
        ) =>
          getDocumentsBySource(
            sourceModule,
            sourceEntityType,
            sourceEntityId,
            documentDeps,
          ),
        getDueSoonDocuments: (
          days: Parameters<typeof getDueSoonDocuments>[0],
        ) => getDueSoonDocuments(days, documentDeps),
        getEscalatableDocuments: () => getEscalatableDocuments(documentDeps),
        getExpiredAndOverdueDocuments: () =>
          getExpiredAndOverdueDocuments(documentDeps),
        getExpiredDocuments: () => getExpiredDocuments(documentDeps),
        getExpiringDocuments: (
          days: Parameters<typeof getExpiringDocuments>[0],
        ) => getExpiringDocuments(days, documentDeps),
        getOverdueDocuments: () => getOverdueDocuments(documentDeps),
        getRenewalChain: (id: Parameters<typeof getRenewalChain>[0]) =>
          getRenewalChain(id, documentDeps),
        getTimeline: (days: Parameters<typeof getDocumentTimeline>[0]) =>
          getDocumentTimeline(days, documentDeps),
        list: (filters: Parameters<typeof listDocuments>[0]) =>
          listDocuments(filters, documentDeps),
        markRenewalInProgress: (
          id: Parameters<typeof markRenewalInProgress>[0],
        ) => markRenewalInProgress(id, documentDeps),
        reject: (
          id: Parameters<typeof rejectDocument>[0],
          reviewerId: Parameters<typeof rejectDocument>[1],
          reason: Parameters<typeof rejectDocument>[2],
        ) => rejectDocument(id, reviewerId, reason, documentDeps),
        renew: (
          id: Parameters<typeof renewDocument>[0],
          newData: Parameters<typeof renewDocument>[1],
        ) => renewDocument(id, newData, documentDeps),
        snooze: (
          id: Parameters<typeof snoozeDocument>[0],
          days: Parameters<typeof snoozeDocument>[1],
          snoozedBy: Parameters<typeof snoozeDocument>[2],
        ) => snoozeDocument(id, days, snoozedBy, documentDeps),
        submit: (id: Parameters<typeof submitDocument>[0]) =>
          submitDocument(id, documentDeps),
        update: (
          id: Parameters<typeof updateDocument>[0],
          patch: Parameters<typeof updateDocument>[1],
        ) => updateDocument(id, patch, documentDeps),
        updateEscalatedAt: (
          id: Parameters<typeof updateDocumentEscalatedAt>[0],
        ) => updateDocumentEscalatedAt(id, documentDeps),
        updateNotifiedAt: (
          id: Parameters<typeof updateDocumentNotifiedAt>[0],
        ) => updateDocumentNotifiedAt(id, documentDeps),
        updateStatus: (
          id: Parameters<typeof updateDocumentStatus>[0],
          status: Parameters<typeof updateDocumentStatus>[1],
          performedBy: Parameters<typeof updateDocumentStatus>[2],
        ) => updateDocumentStatus(id, status, performedBy, documentDeps),
        uploadAttachment: (
          id: Parameters<typeof uploadDocumentAttachment>[0],
          storageKey: Parameters<typeof uploadDocumentAttachment>[1],
        ) => uploadDocumentAttachment(id, storageKey, documentDeps),
        verify: (
          id: Parameters<typeof verifyDocument>[0],
          reviewerId: Parameters<typeof verifyDocument>[1],
        ) => verifyDocument(id, reviewerId, documentDeps),
      },
      obligations: {
        activate: (id: Parameters<typeof activateObligation>[0]) =>
          activateObligation(id, obligationDeps),
        create: (input: Parameters<typeof createObligation>[0]) =>
          createObligation(input, obligationDeps),
        deactivate: (id: Parameters<typeof deactivateObligation>[0]) =>
          deactivateObligation(id, obligationDeps),
        getActiveObligations: () => getActiveObligations(obligationDeps),
        getById: (id: Parameters<typeof getObligationById>[0]) =>
          getObligationById(id, obligationDeps),
        getUpcomingPeriods: (
          obligation: Parameters<typeof getUpcomingPeriods>[0],
          count: Parameters<typeof getUpcomingPeriods>[1],
        ) => getUpcomingPeriods(obligation, count),
        list: (filters: Parameters<typeof listObligations>[0]) =>
          listObligations(filters, obligationDeps),
        update: (
          id: Parameters<typeof updateObligation>[0],
          patch: Parameters<typeof updateObligation>[1],
        ) => updateObligation(id, patch, obligationDeps),
      },
      verification: {
        create: (input: Parameters<typeof createVerificationRule>[0]) =>
          createVerificationRule(input, verificationDeps),
        delete: (id: Parameters<typeof deleteVerificationRule>[0]) =>
          deleteVerificationRule(id, verificationDeps),
        getById: (id: Parameters<typeof getVerificationRuleById>[0]) =>
          getVerificationRuleById(id, verificationDeps),
        list: (filters: Parameters<typeof listVerificationRules>[0]) =>
          listVerificationRules(filters, verificationDeps),
        match: (document: Parameters<typeof matchVerificationRule>[0]) =>
          matchVerificationRule(document, verificationDeps),
        update: (
          id: Parameters<typeof updateVerificationRule>[0],
          patch: Parameters<typeof updateVerificationRule>[1],
        ) => updateVerificationRule(id, patch, verificationDeps),
      },
    };
  }
}
