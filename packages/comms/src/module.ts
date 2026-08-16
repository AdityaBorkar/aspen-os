import { acl } from "#/auth";
import { control_plane_schemas, tenant_schemas } from "#/db-schemas";
import { events } from "#/pubsub";
import { setCommsRuntime } from "#/runtime";
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

  #db: DatabaseUnit | null = null;
  #kvStore: KvStoreUnit | null = null;
  #pubsub: PubSubUnit | null = null;
  #sweeperTopic: string | null = null;
  #bridgeTopics: string[] = [];

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
    this.#db = units.db;
    this.#kvStore = units.kvStore;
    this.#pubsub = units.pubsub;
    setCommsRuntime(units);
  }

  async $prepareRuntime(): Promise<void> {
    if (!this.#db || !this.#kvStore || !this.#pubsub) {
      return;
    }

    this.#sweeperTopic = await registerMessageSweeper(this.#pubsub);
    await registerMessageSweepHandler(this.#sweeperTopic, {
      batchSize: 100,
      db: this.#db,
      kvStore: this.#kvStore,
      pubsub: this.#pubsub,
    });

    const ctx = getContext();
    if (!ctx.audit) {
      return;
    }

    this.#bridgeTopics = await registerEventBridgeSubscriptions({
      audit: ctx.audit,
      db: this.#db.controlPlaneDb,
      dbUnit: this.#db,
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
    this.#db = null;
    this.#kvStore = null;
    this.#pubsub = null;
  }

  get channels() {
    if (!this.#db || !this.#kvStore) {
      throw new Error("Comms not initialized");
    }
    return {
      ...wf.channelActions,
      create: createChannel(this.#kvStore),
      delete: deleteChannel(this.#kvStore),
      ensureDefaults: ensureDefaults(this.#db),
      rotateCredential: rotateChannelCredential(this.#kvStore),
      test: testChannel(this.#kvStore),
    };
  }

  get providers() {
    if (!this.#kvStore) {
      throw new Error("Comms not initialized");
    }
    return {
      ...wf.providerActions,
      create: createProvider(this.#kvStore),
    };
  }

  readonly notifications = wf.notifications;
  readonly preferences = wf.preferences;
  readonly templates = wf.templates;
  readonly settings = wf.settings;
  readonly messages = wf.messages;
}
