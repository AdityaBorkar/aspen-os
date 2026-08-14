import {
  getContext,
  type DatabaseUnit,
  type KvStoreUnit,
  type Module,
  type ModuleInfra,
  type PubSubUnit,
} from "@aspen-os/platform/server";

import { acl } from "./auth";
import { control_plane_schemas, tenant_schemas } from "./db-schemas";
import { events } from "./pubsub";
import { registerEventBridgeSubscriptions, unregisterEventBridge } from "./services/event-bridge";
import {
  registerObligationGenerator,
  unregisterObligationGenerator,
} from "./services/obligation-generator";
import {
  registerReminderHandlers,
  registerReminderSchedules,
  unregisterReminderEngine,
} from "./services/reminder-engine";
import { audit, dashboard, documents, obligations, verification } from "./workflows";

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

  $initialize(units: { db: DatabaseUnit; kvStore: KvStoreUnit; pubsub: PubSubUnit }): void {
    this.#db = units.db;
    this.#pubsub = units.pubsub;
    this.#kvStore = units.kvStore;
  }

  async $prepareRuntime(): Promise<void> {
    if (!this.#db || !this.#pubsub || !this.#kvStore) {
      return;
    }

    const ctx = getContext();
    if (!ctx.audit) {
      return;
    }

    await registerReminderSchedules({ pubsub: this.#pubsub });

    const reminderDeps = {
      audit: ctx.audit,
      cacheTtl: this.$config.dashboardCacheTtl ?? 300,
      db: this.#db.db,
      kvStore: this.#kvStore,
      pubsub: this.#pubsub,
    };

    this.#reminderTopics = await registerReminderHandlers(reminderDeps);

    this.#obligationGenTopic = await registerObligationGenerator();

    const eventBridgeDeps = {
      audit: ctx.audit,
      db: this.#db.db,
      pubsub: this.#pubsub,
    };

    this.#eventBridgeTopics = await registerEventBridgeSubscriptions(eventBridgeDeps);
  }

  async $cleanup(): Promise<void> {
    if (this.#pubsub) {
      await unregisterReminderEngine(this.#reminderTopics, {
        pubsub: this.#pubsub,
      });
      if (this.#obligationGenTopic) {
        await unregisterObligationGenerator(this.#obligationGenTopic);
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

  readonly audit = audit;
  readonly dashboard = dashboard;
  readonly documents = documents;
  readonly obligations = obligations;
  readonly verification = verification;
}
