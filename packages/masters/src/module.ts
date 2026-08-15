import { acl } from "#/auth";
import { control_plane_schemas, tenant_schemas } from "#/db-schemas";
import { events } from "#/pubsub";
import * as wf from "#/workflows";
import { createConnection } from "#/workflows/connection/create";
import { rotateConnectionCredential } from "#/workflows/connection/rotate-credential";

import type { DatabaseUnit, KvStoreUnit, Module, ModuleInfra } from "@aspen-os/platform/server";

export type MastersModuleConfig = undefined;

export class Masters implements Module {
  static create(config?: MastersModuleConfig): Masters {
    return new Masters(config);
  }

  readonly $name = "masters";
  readonly $dependencies: readonly string[] = [];
  readonly $config: MastersModuleConfig;

  #kvStore: KvStoreUnit | null = null;

  constructor(config: MastersModuleConfig) {
    this.$config = config;
  }

  $prepareInfra(): ModuleInfra {
    return {
      auth: { acl },
      db: { control_plane_schemas, tenant_schemas },
      events,
    };
  }

  $initialize(units: { db: DatabaseUnit; kvStore: KvStoreUnit }): void {
    this.#kvStore = units.kvStore;
  }

  $prepareRuntime() {}

  $cleanup() {}

  readonly addresses = wf.addresses;
  readonly bankAccounts = wf.bankAccounts;
  readonly contacts = wf.contacts;
  readonly notes = wf.notes;

  get connections() {
    if (!this.#kvStore) {
      throw new Error("Masters not initialized");
    }
    return {
      ...wf.connectionActions,
      create: createConnection(this.#kvStore),
      rotateCredential: rotateConnectionCredential(this.#kvStore),
    };
  }
}
