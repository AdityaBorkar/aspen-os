import { acl } from "#/auth";
import { control_plane_schemas, tenant_schemas } from "#/db-schemas";
import { events } from "#/pubsub";
import { setDmsConfig, setDmsStorage, resetDmsRuntime } from "#/runtime";
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

function isUnit(unit: Unit | undefined, name: "db"): unit is DatabaseUnit;
function isUnit(unit: Unit | undefined, name: "pubsub"): unit is PubSubUnit;
function isUnit(unit: Unit | undefined, name: "storage"): unit is StorageUnit;
function isUnit(unit: Unit | undefined, name: string): boolean {
  return unit?.$name === name;
}

export class Dms implements Module {
  static create(config?: DmsModuleConfig): Dms {
    return new Dms(config ?? {});
  }

  readonly $name = "dms";
  readonly $dependencies: readonly string[] = ["db", "pubsub", "storage"];
  readonly $config: Required<DmsModuleConfig>;

  #db: DatabaseUnit | null = null;
  #pubsub: PubSubUnit | null = null;
  #expiryTopic: string | null = null;
  #purgeTopic: string | null = null;

  constructor(config: DmsModuleConfig) {
    this.$config = {
      ...DEFAULT_CONFIG,
      ...config,
      defaultCompression: { ...DEFAULT_CONFIG.defaultCompression, ...config.defaultCompression },
    };
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
    if (isUnit(db, "db")) {
      this.#db = db;
    }
    if (isUnit(pubsub, "pubsub")) {
      this.#pubsub = pubsub;
    }
    if (isUnit(storage, "storage")) {
      setDmsStorage(storage);
    }
  }

  async $prepareRuntime(): Promise<void> {
    if (!this.#pubsub || !this.#db) {
      throw new Error("DMS runtime units not initialized: db and pubsub are required");
    }

    const ctx = getContext();
    if (!ctx.audit) {
      throw new Error("DMS runtime requires an audit unit in context");
    }

    const deps = {
      audit: ctx.audit,
      db: this.#db.db,
      pubsub: this.#pubsub,
    };

    const [expiryTopic, purgeTopic] = await Promise.all([
      registerExpiryScanner(this.#pubsub),
      registerPurgeSchedule(this.#pubsub),
    ]);
    this.#expiryTopic = expiryTopic;
    this.#purgeTopic = purgeTopic;

    await Promise.all([
      registerExpiryScanHandler(expiryTopic, deps),
      registerPurgeHandler(purgeTopic, deps),
    ]);
  }

  async $cleanup(): Promise<void> {
    if (this.#pubsub) {
      const pubsub = this.#pubsub;
      await Promise.allSettled([
        unregisterExpiryScanner(this.#expiryTopic, { pubsub }),
        unregisterPurgeSchedule(this.#purgeTopic, { pubsub }),
      ]);
    }
    this.#expiryTopic = null;
    this.#purgeTopic = null;
    this.#db = null;
    this.#pubsub = null;
    resetDmsRuntime();
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
  readonly search = wf.search;
  readonly settings = wf.settings;
  readonly shares = wf.shares;
  readonly storage = wf.storage;
  readonly trash = wf.trash;
  readonly triage = wf.triage;
  readonly versions = wf.versions;
}
