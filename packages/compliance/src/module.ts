import { acl } from "#/auth";
import { control_plane_schemas, tenant_schemas } from "#/db-schemas";
import { events } from "#/pubsub";
import { registerEventBridgeSubscriptions } from "#/services/event-bridge";
import { registerObligationGenerator } from "#/services/obligation-generator";
import { registerReminderHandlers, registerReminderSchedules } from "#/services/reminder-engine";
import { audit, dashboard, documents, obligations, verification } from "#/workflows";

import { getContext } from "@aspen-os/platform/server";
import type {
  DatabaseUnit,
  KvStoreUnit,
  Module,
  ModuleInfra,
  PubSubUnit,
} from "@aspen-os/platform/server";

export interface ComplianceModuleConfig {
  country: "INDIA";
  dashboardCacheTtl?: number;
  defaultEscalationDays?: number[];
  defaultReminderDays?: number[];
}

export class Compliance implements Module {
  static create(config: ComplianceModuleConfig): Compliance {
    return new Compliance(config);
  }

  readonly $name = "compliance";
  readonly $dependencies: readonly string[] = [];
  /**
   * Optional peer topics consumed by the event bridge. Introspection-only —
   * never validated, so compliance runs solo or in any subset. A missing
   * producer (including not-yet-implemented stub modules) means its handler
   * silently no-ops.
   */
  readonly $consumes: readonly string[] = [
    "hr:employee_onboarded",
    "hr:employee_separated",
    "fleet:vehicle_registered",
    "masters:org_branch_created",
    "accounting:financial_year_started",
    "masters:contact_created",
  ];
  readonly $config: ComplianceModuleConfig;

  #db: DatabaseUnit | null = null;
  #pubsub: PubSubUnit | null = null;
  #kvStore: KvStoreUnit | null = null;
  #topics: string[] = [];

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

  $initialize(units: { db: DatabaseUnit; kvStore: KvStoreUnit; pubsub: PubSubUnit }): void {
    this.#db = units.db;
    this.#pubsub = units.pubsub;
    this.#kvStore = units.kvStore;
  }

  async $prepareRuntime(): Promise<void> {
    if (!this.#db || !this.#pubsub || !this.#kvStore) {
      throw new Error("Compliance module requires db, pubsub, and kvStore units");
    }

    const ctx = getContext();
    if (!ctx.audit) {
      throw new Error("Compliance module requires an audit context for runtime schedules");
    }

    await registerReminderSchedules({ pubsub: this.#pubsub });

    const reminderDeps = {
      audit: ctx.audit,
      cacheTtl: this.$config.dashboardCacheTtl ?? 300,
      db: this.#db.db,
      kvStore: this.#kvStore,
      pubsub: this.#pubsub,
    };

    const reminderTopics = await registerReminderHandlers(reminderDeps);
    const obligationGenTopic = await registerObligationGenerator();

    const eventBridgeDeps = {
      audit: ctx.audit,
      db: this.#db.db,
      pubsub: this.#pubsub,
    };

    const eventBridgeTopics = await registerEventBridgeSubscriptions(eventBridgeDeps);
    this.#topics = [...reminderTopics, obligationGenTopic, ...eventBridgeTopics];
  }

  async $cleanup(): Promise<void> {
    const pubsub = this.#pubsub;
    if (pubsub && this.#topics.length > 0) {
      await Promise.all(
        this.#topics.map(async (topic) => {
          try {
            await pubsub.unsubscribe(topic);
          } catch {
            // Ignore unsubscribe failures during cleanup.
          }
        }),
      );
    }
    this.#topics = [];
    this.#db = null;
    this.#pubsub = null;
    this.#kvStore = null;
  }

  readonly audit = audit;
  readonly dashboard = dashboard;
  readonly documents = documents;
  readonly obligations = obligations;
  readonly verification = verification;
}
