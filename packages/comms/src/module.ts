import { acl } from "#/auth";
import { control_plane_schemas, tenant_schemas } from "#/db-schemas";
import { events } from "#/pubsub";
import {
  registerMessageSweepHandler,
  registerMessageSweeper,
  unregisterMessageSweeper,
} from "#/services/delivery-worker";
import { registerEventBridgeSubscriptions, unregisterEventBridge } from "#/services/event-bridge";
import * as wf from "#/workflows";
import { createChannel } from "#/workflows/channel/create";
import { deleteChannel } from "#/workflows/channel/delete";
import { ensureDefaults } from "#/workflows/channel/ensure-defaults";
import { rotateChannelCredential } from "#/workflows/channel/rotate-credential";
import { testChannel } from "#/workflows/channel/test";
import { createNotify } from "#/workflows/notification/notify";
import { createProvider } from "#/workflows/provider/create";

import type {
  AuthUnit,
  DatabaseUnit,
  KvStoreUnit,
  Module,
  ModuleInfra,
  PubSubUnit,
} from "@aspen-os/platform/server";
import { getContext } from "@aspen-os/platform/server";

export type CommsModuleConfig = undefined;

export class Comms implements Module {
  static create(config?: CommsModuleConfig): Comms {
    return new Comms(config);
  }

  readonly $name = "comms";
  readonly $dependencies: readonly string[] = [];
  readonly $config: CommsModuleConfig;

  #auth: AuthUnit | null = null;
  #db: DatabaseUnit | null = null;
  #kvStore: KvStoreUnit | null = null;
  #pubsub: PubSubUnit | null = null;
  #sweeperTopic: string | null = null;
  #bridgeTopics: string[] = [];
  #channels: ReturnType<Comms["buildChannels"]> | null = null;
  #providers: ReturnType<Comms["buildProviders"]> | null = null;
  #notifications: ReturnType<Comms["buildNotifications"]> | null = null;

  constructor(config: CommsModuleConfig) {
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
    auth: AuthUnit;
    db: DatabaseUnit;
    kvStore: KvStoreUnit;
    pubsub: PubSubUnit;
  }): void {
    this.#auth = units.auth;
    this.#db = units.db;
    this.#kvStore = units.kvStore;
    this.#pubsub = units.pubsub;
  }

  async $prepareRuntime(): Promise<void> {
    if (!this.#db || !this.#kvStore || !this.#pubsub || !this.#auth) {
      throw new Error("Comms cannot start: db, kvStore, pubsub, and auth units are required.");
    }

    this.#sweeperTopic = await registerMessageSweeper(this.#pubsub);
    const ctx = getContext();
    await registerMessageSweepHandler(this.#sweeperTopic, {
      batchSize: 100,
      db: this.#db,
      kvStore: this.#kvStore,
      log: ctx.log,
      pubsub: this.#pubsub,
    });

    this.#bridgeTopics = await registerEventBridgeSubscriptions({
      audit: ctx.audit,
      auth: this.#auth,
      db: this.#db.controlPlaneDb,
      dbUnit: this.#db,
      kvStore: this.#kvStore,
      log: ctx.log,
      pubsub: this.#pubsub,
    });
  }

  async $cleanup(): Promise<void> {
    if (this.#pubsub) {
      await unregisterMessageSweeper(this.#sweeperTopic, { pubsub: this.#pubsub });
      await unregisterEventBridge(this.#bridgeTopics, { pubsub: this.#pubsub });
    }
    this.#bridgeTopics = [];
    this.#sweeperTopic = null;
    this.#auth = null;
    this.#db = null;
    this.#kvStore = null;
    this.#pubsub = null;
    this.#channels = null;
    this.#providers = null;
    this.#notifications = null;
  }

  private buildChannels() {
    if (!this.#db || !this.#kvStore) {
      throw new Error("Comms not initialized");
    }
    const db = this.#db;
    const kvStore = this.#kvStore;
    return {
      ...wf.channelActions,
      create: createChannel(kvStore),
      delete: deleteChannel(kvStore),
      ensureDefaults: ensureDefaults(db),
      rotateCredential: rotateChannelCredential(kvStore),
      test: testChannel(kvStore),
    };
  }

  private buildProviders() {
    if (!this.#kvStore) {
      throw new Error("Comms not initialized");
    }
    const kvStore = this.#kvStore;
    return {
      ...wf.providerActions,
      create: createProvider(kvStore),
    };
  }

  private buildNotifications() {
    if (!this.#db) {
      throw new Error("Comms not initialized");
    }
    return {
      ...wf.notifications,
      notify: createNotify(this.#db),
    };
  }

  get channels() {
    if (!this.#channels) {
      this.#channels = this.buildChannels();
    }
    return this.#channels;
  }

  get providers() {
    if (!this.#providers) {
      this.#providers = this.buildProviders();
    }
    return this.#providers;
  }

  get notifications() {
    if (!this.#notifications) {
      this.#notifications = this.buildNotifications();
    }
    return this.#notifications;
  }

  readonly preferences = wf.preferences;
  readonly templates = wf.templates;
  readonly settings = wf.settings;
  readonly messages = wf.messages;
}
