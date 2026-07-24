import type {
  DatabaseUnit,
  Module,
  ModuleInfra,
  PubSubUnit,
  StorageUnit,
} from "@aspen-os/platform/server";

import { acl } from "./auth-acl";
import { schemas } from "./db-schemas";
import { events } from "./pubsub-events";
import { AccessService } from "./services/access-service";
import { ArchiveService } from "./services/archive-service";
import { PathService } from "./services/path-service";
import { SearchService } from "./services/search-service";
import { StorageBridge } from "./services/storage-bridge";
import type { DriveModuleConfig } from "./types";
import { FileWorkflow } from "./workflows/file";
import { FolderWorkflow } from "./workflows/folder";
import { LabelWorkflow } from "./workflows/label";
import { PublicLinkWorkflow } from "./workflows/public-link";
import { ShareWorkflow } from "./workflows/share";
import { TrashWorkflow } from "./workflows/trash";

export type { DriveEventMap } from "./pubsub-events";
export { DRIVE_EVENTS } from "./pubsub-events";
export type { ArchiveJobData, ArchiveResult } from "./services/archive-service";
export { ArchiveTooLargeError } from "./services/archive-service";
export * from "./types";
export type { ResolvedPublicLink } from "./workflows/public-link";

import * as dbSchema from "./db-schema";

export { dbSchema };

const DEFAULT_CONFIG = {
  allowedContentTypes: [] as string[],
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
  readonly config: Required<DriveModuleConfig>;

  #folders: FolderWorkflow | null = null;
  #files: FileWorkflow | null = null;
  #labels: LabelWorkflow | null = null;
  #shares: ShareWorkflow | null = null;
  #publicLinks: PublicLinkWorkflow | null = null;
  #trash: TrashWorkflow | null = null;
  #search: SearchService | null = null;
  #archive: ArchiveService | null = null;
  #access: AccessService | null = null;
  #paths: PathService | null = null;
  #pubsub: PubSubUnit | null = null;

  static create(config?: DriveModuleConfig): Drive {
    return new Drive(config ?? {});
  }

  constructor(config: DriveModuleConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
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
    storage: StorageUnit;
    pubsub: PubSubUnit;
  }): void {
    const db = units.db.db;

    const pathService = new PathService(db, this.config.maxNestingDepth);
    const storageBridge = new StorageBridge(units.storage);
    const accessService = new AccessService(db);

    this.#paths = pathService;
    this.#access = accessService;
    this.#search = new SearchService(db);
    this.#archive = new ArchiveService(db, storageBridge);

    this.#folders = new FolderWorkflow(db, pathService, units.pubsub);
    this.#files = new FileWorkflow(
      db,
      storageBridge,
      pathService,
      units.pubsub,
      {
        allowedContentTypes: this.config.allowedContentTypes,
        defaultDownloadLinkExpiry: this.config.defaultDownloadLinkExpiry,
        maxDownloadLinkExpiry: this.config.maxDownloadLinkExpiry,
        maxFileSize: this.config.maxFileSize,
        maxVersions: this.config.maxVersions,
      },
    );
    this.#labels = new LabelWorkflow(db);
    this.#shares = new ShareWorkflow(db, units.pubsub);
    this.#publicLinks = new PublicLinkWorkflow(db, accessService, units.pubsub);
    this.#trash = new TrashWorkflow(db, storageBridge, units.pubsub, {
      trashRetentionDays: this.config.trashRetentionDays,
    });
    this.#pubsub = units.pubsub;
  }

  async $prepareRuntime(): Promise<void> {
    if (!this.#pubsub || !this.#trash) return;

    await this.#pubsub.subscribe(PURGE_TOPIC, async () => {
      await this.#trash?.purgeExpired();
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

    this.#paths = null;
    this.#access = null;
    this.#archive = null;
    this.#search = null;
    this.#folders = null;
    this.#files = null;
    this.#labels = null;
    this.#shares = null;
    this.#publicLinks = null;
    this.#trash = null;
    this.#pubsub = null;
  }

  get folders() {
    if (!this.#folders) throw new Error("Drive not initialized");
    return this.#folders;
  }

  get files() {
    if (!this.#files) throw new Error("Drive not initialized");
    return this.#files;
  }

  get labels() {
    if (!this.#labels) throw new Error("Drive not initialized");
    return this.#labels;
  }

  get shares() {
    if (!this.#shares) throw new Error("Drive not initialized");
    return this.#shares;
  }

  get publicLinks() {
    if (!this.#publicLinks) throw new Error("Drive not initialized");
    return this.#publicLinks;
  }

  get trash() {
    if (!this.#trash) throw new Error("Drive not initialized");
    return this.#trash;
  }

  get search() {
    if (!this.#search) throw new Error("Drive not initialized");
    return this.#search;
  }

  get archive() {
    if (!this.#archive) throw new Error("Drive not initialized");
    return this.#archive;
  }

  get access() {
    if (!this.#access) throw new Error("Drive not initialized");
    return this.#access;
  }

  get paths() {
    if (!this.#paths) throw new Error("Drive not initialized");
    return this.#paths;
  }
}
