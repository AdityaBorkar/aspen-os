import type {
  DatabaseUnit,
  KvStoreUnit,
  ModuleInfra,
  PubSubUnit,
} from "@aspen-os/framework/server";

import * as dbSchema from "./db-schema";
import { COMPLIANCE_EVENTS } from "./event-map";
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
  readonly $name = "compliance";
  readonly $dependencies: readonly string[] = [];

  #documents: DocumentWorkflow | null = null;
  #obligations: ObligationWorkflow | null = null;
  #verification: VerificationWorkflow | null = null;
  #audit: AuditWorkflow | null = null;
  #dashboard: DashboardWorkflow | null = null;
  #reminderEngine: ReminderEngine | null = null;
  #obligationGenerator: ObligationGenerator | null = null;
  #eventBridge: EventBridge | null = null;

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

  $initialize(units: {
    db: DatabaseUnit;
    kvStore: KvStoreUnit;
    pubsub: PubSubUnit;
  }): void {
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

  $prepareInfra(): ModuleInfra {
    return {
      auth: {
        acl: {
          complianceAuditEntry: { allowedActions: ["read"] },
          complianceDocument: {
            allowedActions: [
              "archive",
              "create",
              "delete",
              "read",
              "reject",
              "update",
              "verify",
            ],
          },
          complianceObligation: {
            allowedActions: [
              "activate",
              "create",
              "deactivate",
              "delete",
              "read",
              "update",
            ],
          },
          complianceVerificationRule: {
            allowedActions: ["create", "delete", "read", "update"],
          },
        },
      },
      db: { schemas: dbSchema.complianceTables },
      events: { compliance: COMPLIANCE_EVENTS },
    };
  }

  async $prepareRuntime(): Promise<void> {
    await this.#reminderEngine?.registerSchedules();
    await this.#reminderEngine?.registerHandlers();
    await this.#obligationGenerator?.registerHandler();
    await this.#eventBridge?.registerSubscriptions();
  }

  async $cleanup(): Promise<void> {
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
  }
}

function notInitialized(): Error {
  return new Error(
    "Compliance module not initialized. Call $initialize() after Framework.create().",
  );
}
