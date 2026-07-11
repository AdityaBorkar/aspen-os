import type {
  DatabaseUnit,
  KvStoreUnit,
  PubSubUnit,
} from "@aspen-os/framework/server";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import * as dbSchema from "./db-schema";
import { EventBridge } from "./services/event-bridge";
import { ObligationGenerator } from "./services/obligation-generator";
import { ReminderEngine } from "./services/reminder-engine";
import { AuditWorkflow } from "./workflows/audit";
import { DashboardWorkflow } from "./workflows/dashboard";
import { DocumentWorkflow } from "./workflows/document";
import { ObligationWorkflow } from "./workflows/obligation";
import { VerificationWorkflow } from "./workflows/verification";

export type {
  AuditAction,
  AuditEntityType,
  ComplianceCategory,
  ObligationFrequency,
  ReminderChannel,
  RenewalFrequency,
  VerificationStatus,
} from "./constants";
export type {
  ComplianceAuditEntry,
  ComplianceDocument,
  ComplianceObligation,
  ComplianceVerificationRule,
} from "./db-schema";
export type {
  ComplianceEventMap,
  DocumentCompletedEvent,
  DocumentCreatedEvent,
  DocumentDueEvent,
  DocumentEscalatedEvent,
  DocumentExpiredEvent,
  DocumentExpiringEvent,
  DocumentGeneratedEvent,
  DocumentOverdueEvent,
  DocumentRejectedEvent,
  DocumentRenewedEvent,
  DocumentVerifiedEvent,
  WeeklySummaryEvent,
} from "./event-map";
export { COMPLIANCE_EVENTS } from "./event-map";
export type {
  AuditTrailFilters,
  ComplianceDocumentFilters,
  CreateComplianceDocumentInput,
  CreateObligationInput,
  CreateVerificationRuleInput,
  DashboardSummary,
  ObligationFilters,
  PeriodPreview,
  RenewalChainEntry,
  TimelineEntry,
  UpdateComplianceDocumentInput,
  UpdateObligationInput,
  UpdateVerificationRuleInput,
} from "./types";
export { dbSchema };

export type ComplianceModuleConfig = {
  country: "INDIA";
  dashboardCacheTtl?: number;
  defaultEscalationDays?: number[];
  defaultReminderDays?: number[];
};

export class ComplianceModule {
  static create(config: ComplianceModuleConfig): ComplianceModule {
    return new ComplianceModule(config);
  }

  constructor(private config: ComplianceModuleConfig) {}

  readonly db_schema = dbSchema;
  readonly name = "compliance";

  #documents: DocumentWorkflow | null = null;
  #obligations: ObligationWorkflow | null = null;
  #verification: VerificationWorkflow | null = null;
  #audit: AuditWorkflow | null = null;
  #dashboard: DashboardWorkflow | null = null;
  #reminderEngine: ReminderEngine | null = null;
  #obligationGenerator: ObligationGenerator | null = null;
  #eventBridge: EventBridge | null = null;
  #db: NodePgDatabase | null = null;

  get documents(): DocumentWorkflow {
    if (!this.#documents) throw notInitialized();
    return this.#documents;
  }

  get obligations(): ObligationWorkflow {
    if (!this.#obligations) throw notInitialized();
    return this.#obligations;
  }

  get verification(): VerificationWorkflow {
    if (!this.#verification) throw notInitialized();
    return this.#verification;
  }

  get audit(): AuditWorkflow {
    if (!this.#audit) throw notInitialized();
    return this.#audit;
  }

  get dashboard(): DashboardWorkflow {
    if (!this.#dashboard) throw notInitialized();
    return this.#dashboard;
  }

  initialize(units: {
    db: DatabaseUnit;
    kvStore: KvStoreUnit;
    pubsub: PubSubUnit;
  }): void {
    this.#db = units.db.db;
    this.#documents = new DocumentWorkflow(units.db.db, units.pubsub);
    this.#obligations = new ObligationWorkflow(units.db.db, units.pubsub);
    this.#verification = new VerificationWorkflow(units.db.db);
    this.#audit = new AuditWorkflow(units.db.db);
    this.#dashboard = new DashboardWorkflow(
      units.db.db,
      units.kvStore,
      this.config.dashboardCacheTtl,
    );
    this.#reminderEngine = new ReminderEngine(
      units.db.db,
      units.pubsub,
      this.#documents,
      this.#dashboard,
    );
    this.#obligationGenerator = new ObligationGenerator(
      units.db.db,
      units.pubsub,
      this.#documents,
      this.#obligations,
    );
    this.#eventBridge = new EventBridge(
      units.pubsub,
      this.#documents,
      this.#obligations,
    );
  }

  async prepare(): Promise<void> {
    if (!this.#db) throw notInitialized();

    const { pushSchema } = await import("drizzle-kit/api");
    const result = await pushSchema(dbSchema.complianceTables, this.#db);
    if (result.statementsToExecute.length > 0) {
      console.log(
        `[compliance] Applying schema: ${result.statementsToExecute.length} statements`,
      );
      if (result.hasDataLoss) {
        console.warn(
          "[compliance] Schema push has data loss warnings:",
          result.warnings,
        );
      }
      await result.apply();
      console.log("[compliance] Schema applied");
    }

    await this.#reminderEngine?.registerSchedules();
    await this.#reminderEngine?.registerHandlers();
    await this.#obligationGenerator?.registerHandler();
    await this.#eventBridge?.registerSubscriptions();
  }

  async destroy(): Promise<void> {
    await this.#reminderEngine?.unregister();
    await this.#obligationGenerator?.unregister();
    await this.#eventBridge?.unregister();
    this.#documents = null;
    this.#obligations = null;
    this.#verification = null;
    this.#audit = null;
    this.#dashboard = null;
    this.#reminderEngine = null;
    this.#obligationGenerator = null;
    this.#eventBridge = null;
    this.#db = null;
  }
}

function notInitialized(): Error {
  return new Error(
    "Compliance module not initialized. Call initialize() after framework.initialize().",
  );
}
