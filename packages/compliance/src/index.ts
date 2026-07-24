import type {
  DatabaseUnit,
  KvStoreUnit,
  Module,
  ModuleInfra,
  PubSubUnit,
} from "@aspen-os/platform/server";

import { acl } from "./auth-acl";
import { schemas } from "./db-schemas";
import { events } from "./pubsub-events";
import { EventBridge } from "./services/event-bridge";
import { ObligationGenerator } from "./services/obligation-generator";
import { ReminderEngine } from "./services/reminder-engine";
import { AuditWorkflow } from "./workflows/audit";
import { DashboardWorkflow } from "./workflows/dashboard";
import { DocumentWorkflow } from "./workflows/document";
import { ObligationWorkflow } from "./workflows/obligation";
import { VerificationWorkflow } from "./workflows/verification";

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

  #documents: DocumentWorkflow | null = null;
  #obligations: ObligationWorkflow | null = null;
  #verification: VerificationWorkflow | null = null;
  #audit: AuditWorkflow | null = null;
  #dashboard: DashboardWorkflow | null = null;
  #reminderEngine: ReminderEngine | null = null;
  #obligationGenerator: ObligationGenerator | null = null;
  #eventBridge: EventBridge | null = null;

  constructor(config: ComplianceModuleConfig) {
    this.$config = config;
  }

  $prepareInfra(): ModuleInfra {
    return {
      auth: { acl },
      db: { schemas },
      events,
    };
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
      this.$config.dashboardCacheTtl,
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
    this.#reminderEngine = null;
    this.#obligationGenerator = null;
    this.#eventBridge = null;
    this.#documents = null;
    this.#obligations = null;
    this.#verification = null;
    this.#audit = null;
    this.#dashboard = null;
  }

  get documents() {
    if (!this.#documents) throw new Error("Compliance not initialized");
    return this.#documents;
  }

  get obligations() {
    if (!this.#obligations) throw new Error("Compliance not initialized");
    return this.#obligations;
  }

  get verification() {
    if (!this.#verification) throw new Error("Compliance not initialized");
    return this.#verification;
  }

  get audit() {
    if (!this.#audit) throw new Error("Compliance not initialized");
    return this.#audit;
  }

  get dashboard() {
    if (!this.#dashboard) throw new Error("Compliance not initialized");
    return this.#dashboard;
  }
}
