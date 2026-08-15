import { acl } from "#/auth";
import { control_plane_schemas, tenant_schemas } from "#/db-schemas";
import { events } from "#/pubsub";
import { setDmsConfig, setDmsStorage } from "#/runtime";
import {
  registerExpiryScanHandler,
  registerExpiryScanner,
  unregisterExpiryScanner,
} from "#/services/expiry-scanner";
import {
  registerPurgeHandler,
  registerPurgeSchedule,
  unregisterPurgeSchedule,
} from "#/services/purge-service";
import type { DmsModuleConfig } from "#/types";
import * as wf from "#/workflows";

import { getContext } from "@aspen-os/platform/server";
import type {
  DatabaseUnit,
  Module,
  ModuleInfra,
  PubSubUnit,
  StorageUnit,
  Unit,
} from "@aspen-os/platform/server";

const DEFAULT_CONFIG: Required<DmsModuleConfig> = {
  allowedContentTypes: [],
  defaultAutoPurgeEveryHours: 24,
  defaultCompression: { enabled: true, mode: "none" },
  defaultDownloadLinkExpiry: 3600,
  defaultRetentionDays: 180,
  maxDownloadLinkExpiry: 604_800,
  maxFileSize: 5 * 1024 * 1024 * 1024,
  maxNestingDepth: 20,
  maxVersions: 10,
  trashRetentionDays: 30,
};

export type { DmsModuleConfig };

function isDatabaseUnit(unit: Unit | undefined): unit is DatabaseUnit {
  return unit?.$name === "db";
}

function isPubSubUnit(unit: Unit | undefined): unit is PubSubUnit {
  return unit?.$name === "pubsub";
}

function isStorageUnit(unit: Unit | undefined): unit is StorageUnit {
  return unit?.$name === "storage";
}

export class Dms implements Module {
  static create(config?: DmsModuleConfig): Dms {
    return new Dms(config ?? {});
  }

  readonly $name = "dms";
  readonly $dependencies: readonly string[] = [];
  readonly $config: Required<DmsModuleConfig>;

  #db: DatabaseUnit | null = null;
  #pubsub: PubSubUnit | null = null;
  #expiryTopic: string | null = null;
  #purgeTopic: string | null = null;

  constructor(config: DmsModuleConfig) {
    this.$config = { ...DEFAULT_CONFIG, ...config };
    setDmsConfig(this.$config);
  }

  $prepareInfra(): ModuleInfra {
    return {
      auth: { acl },
      db: { control_plane_schemas, tenant_schemas },
      events,
    };
  }

  $initialize(units: Record<string, Unit>): void {
    const { db, pubsub, storage } = units;
    if (isDatabaseUnit(db)) {
      this.#db = db;
    }
    if (isPubSubUnit(pubsub)) {
      this.#pubsub = pubsub;
    }
    if (isStorageUnit(storage)) {
      setDmsStorage(storage);
    }
  }

  async $prepareRuntime(): Promise<void> {
    if (!this.#pubsub || !this.#db) {
      return;
    }

    const ctx = getContext();
    if (!ctx.audit) {
      return;
    }

    const deps = {
      audit: ctx.audit,
      db: this.#db.db,
      pubsub: this.#pubsub,
    };

    this.#expiryTopic = await registerExpiryScanner(this.#pubsub);
    await registerExpiryScanHandler(this.#expiryTopic, deps);

    this.#purgeTopic = await registerPurgeSchedule(this.#pubsub);
    await registerPurgeHandler(this.#purgeTopic, deps);
  }

  async $cleanup(): Promise<void> {
    if (this.#pubsub) {
      await unregisterExpiryScanner(this.#expiryTopic, {
        pubsub: this.#pubsub,
      });
      await unregisterPurgeSchedule(this.#purgeTopic, {
        pubsub: this.#pubsub,
      });
    }
    this.#expiryTopic = null;
    this.#purgeTopic = null;
    this.#db = null;
    this.#pubsub = null;
  }

  readonly access = wf.access;
  readonly activity = wf.activity;
  readonly archive = wf.archive;
  readonly classes = wf.classes;
  readonly contacts = wf.contacts;
  readonly fileViews = wf.fileViews;
  readonly files = wf.files;
  readonly folders = wf.folders;
  readonly holds = wf.holds;
  readonly labels = wf.labels;
  readonly paths = wf.paths;
  readonly pins = wf.pins;
  readonly search = wf.search;
  readonly settings = wf.settings;
  readonly shares = wf.shares;
  readonly storage = wf.storage;
  readonly trash = wf.trash;
  readonly triage = wf.triage;
  readonly versions = wf.versions;
}
