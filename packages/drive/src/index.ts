import type {
  DatabaseUnit,
  Module,
  ModuleInfra,
  PubSubUnit,
  StorageUnit,
} from "@aspen-os/platform/server";

import * as dbSchema from "./db-schema";
import { control_plane_schemas, tenant_schemas } from "./db-schemas";
import { events } from "./pubsub-events";
import {
  type DriveRuntimeConfig,
  setDriveConfig,
  setDriveStorage,
} from "./runtime";
import {
  checkPermission,
  getEffectivePermission,
  isOwner,
  logAccess,
} from "./services/access-service";
import { createArchive, processArchiveJob } from "./services/archive-service";
import {
  checkNameUniqueness,
  computeFilePath,
  computeFolderPath,
  getBreadcrumbs,
  getDepth,
  getFilePath,
  getFolderPath,
  getSubtreeMaxDepth,
  resolvePath,
  wouldCreateCycle,
} from "./services/path-service";
import { search } from "./services/search-service";
import {
  computeArchiveKey,
  computeStorageKey,
  copy as copyStorage,
  exists as existsStorage,
  getSignedGetUrl,
  get as getStorage,
  move as moveStorage,
  remove as removeStorage,
  upload as uploadStorage,
} from "./services/storage-bridge";
import type { DriveModuleConfig } from "./types";
import { acl } from "./utils/acl";
import { files } from "./workflows/file";
import { folders } from "./workflows/folder";
import { labels } from "./workflows/label";
import { publicLinks } from "./workflows/public-link";
import { shares } from "./workflows/share";
import { purgeExpiredInternal, trash } from "./workflows/trash";

export type { DriveEventMap } from "./pubsub-events";
export { DRIVE_EVENTS } from "./pubsub-events";
export type { ArchiveJobData, ArchiveResult } from "./services/archive-service";
export { ArchiveTooLargeError } from "./services/archive-service";
export * from "./types";
export type { ResolvedPublicLink } from "./workflows/public-link";
export { dbSchema };

const DEFAULT_CONFIG: Required<DriveModuleConfig> = {
  allowedContentTypes: [],
  defaultDownloadLinkExpiry: 3600,
  maxDownloadLinkExpiry: 7 * 24 * 3600,
  maxFileSize: 5 * 1024 * 1024 * 1024,
  maxNestingDepth: 20,
  maxVersions: 10,
  trashRetentionDays: 30,
};

const PURGE_CRON = "0 3 * * *";
const PURGE_TOPIC = "drive:auto-purge";

export class Drive implements Module {
  readonly $name = "drive";
  readonly $dependencies: readonly string[] = [];
  readonly config: DriveRuntimeConfig;

  #pubsub: PubSubUnit | null = null;

  static create(config?: DriveModuleConfig): Drive {
    return new Drive(config ?? {});
  }

  constructor(config: DriveModuleConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    setDriveConfig(this.config);
  }

  $prepareInfra(): ModuleInfra {
    return {
      auth: { acl },
      db: { control_plane_schemas, tenant_schemas },
      events,
    };
  }

  $initialize(units: {
    db: DatabaseUnit;
    storage: StorageUnit;
    pubsub: PubSubUnit;
  }): void {
    this.#pubsub = units.pubsub;
    setDriveStorage(units.storage);
    void units.db;
  }

  async $prepareRuntime(): Promise<void> {
    if (!this.#pubsub) return;

    await this.#pubsub.subscribe(PURGE_TOPIC, async () => {
      await purgeExpiredInternal();
    });

    await this.#pubsub.schedule(PURGE_TOPIC, PURGE_CRON);
  }

  async $cleanup(): Promise<void> {
    if (this.#pubsub) {
      try {
        await this.#pubsub.unsubscribe(PURGE_TOPIC);
        await this.#pubsub.unschedule(PURGE_TOPIC);
      } catch {
        // ignore
      }
    }

    this.#pubsub = null;
  }

  readonly files = files;
  readonly folders = folders;
  readonly labels = labels;
  readonly publicLinks = publicLinks;
  readonly shares = shares;
  readonly trash = trash;

  readonly access = {
    checkPermission: (input: Parameters<typeof checkPermission>[0]) =>
      checkPermission(input),
    getEffectivePermission: (
      input: Parameters<typeof getEffectivePermission>[0],
    ) => getEffectivePermission(input),
    isOwner: (input: Parameters<typeof isOwner>[0]) => isOwner(input),
    logAccess: (input: Parameters<typeof logAccess>[0]) => logAccess(input),
  };

  readonly archive = {
    createArchive: (input: Parameters<typeof createArchive>[0]) =>
      createArchive(input),
    processArchiveJob: (input: Parameters<typeof processArchiveJob>[0]) =>
      processArchiveJob(input),
  };

  readonly paths = {
    checkNameUniqueness: (input: Parameters<typeof checkNameUniqueness>[0]) =>
      checkNameUniqueness(input),
    computeFilePath: (input: Parameters<typeof computeFilePath>[0]) =>
      computeFilePath(input),
    computeFolderPath: (input: Parameters<typeof computeFolderPath>[0]) =>
      computeFolderPath(input),
    getBreadcrumbs: (input: Parameters<typeof getBreadcrumbs>[0]) =>
      getBreadcrumbs(input),
    getDepth: (input: Parameters<typeof getDepth>[0]) => getDepth(input),
    getFilePath: (input: Parameters<typeof getFilePath>[0]) =>
      getFilePath(input),
    getFolderPath: (input: Parameters<typeof getFolderPath>[0]) =>
      getFolderPath(input),
    getSubtreeMaxDepth: (input: Parameters<typeof getSubtreeMaxDepth>[0]) =>
      getSubtreeMaxDepth(input),
    resolvePath: (input: Parameters<typeof resolvePath>[0]) =>
      resolvePath(input),
    wouldCreateCycle: (input: Parameters<typeof wouldCreateCycle>[0]) =>
      wouldCreateCycle(input),
  };

  readonly search = {
    search: (input: Parameters<typeof search>[0]) => search(input),
  };

  readonly storage = {
    computeArchiveKey: (input: Parameters<typeof computeArchiveKey>[0]) =>
      computeArchiveKey(input),
    computeStorageKey: (input: Parameters<typeof computeStorageKey>[0]) =>
      computeStorageKey(input),
    copy: (input: Parameters<typeof copyStorage>[0]) => copyStorage(input),
    exists: (input: Parameters<typeof existsStorage>[0]) =>
      existsStorage(input),
    get: (input: Parameters<typeof getStorage>[0]) => getStorage(input),
    getSignedGetUrl: (input: Parameters<typeof getSignedGetUrl>[0]) =>
      getSignedGetUrl(input),
    move: (input: Parameters<typeof moveStorage>[0]) => moveStorage(input),
    remove: (input: Parameters<typeof removeStorage>[0]) =>
      removeStorage(input),
    upload: (input: Parameters<typeof uploadStorage>[0]) =>
      uploadStorage(input),
  };
}
