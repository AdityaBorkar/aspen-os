import type {
  DatabaseUnit,
  ModuleInfra,
  PubSubUnit,
  StorageUnit,
} from "@aspen-os/framework/server";

import * as dbSchema from "./db-schema";
import { DRIVE_EVENTS } from "./event-map";
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

export type { DriveEventMap } from "./event-map";
export { DRIVE_EVENTS } from "./event-map";
export type { ArchiveJobData, ArchiveResult } from "./services/archive-service";
export { ArchiveTooLargeError } from "./services/archive-service";
export type {
  ApplyLabelInput,
  BreadcrumbItem,
  CreateFolderInput,
  CreateLabelInput,
  CreatePublicLinkInput,
  CreateShareInput,
  DownloadLinkOptions,
  DriveAccessLogRow,
  DriveFileRow,
  DriveFileVersionRow,
  DriveFolderRow,
  DriveGranteeType,
  DriveItemType,
  DriveLabelRow,
  DriveModuleConfig,
  DrivePermission,
  DrivePublicLinkPermission,
  DrivePublicLinkRow,
  DriveSearchScope,
  DriveShareRow,
  EmptyTrashOptions,
  FolderDownloadLinkOptions,
  FolderWithMetadata,
  ListByLabelOptions,
  ListFolderOptions,
  ListLabelsOptions,
  ListSharedWithMeOptions,
  ListTrashOptions,
  MoveFileInput,
  MoveFolderInput,
  PathResolution,
  RenameFileInput,
  RenameFolderInput,
  ResolvePublicLinkInput,
  SearchOptions,
  SearchResult,
  UpdateFileInput,
  UpdateFolderInput,
  UpdatePublicLinkInput,
  UpdateShareInput,
  UploadFileInput,
} from "./types";
export {
  ApplyLabelSchema,
  CreateFolderSchema,
  CreateLabelSchema,
  CreatePublicLinkSchema,
  CreateShareSchema,
  DownloadLinkOptionsSchema,
  DriveGranteeTypeSchema,
  DriveItemTypeSchema,
  DrivePermissionSchema,
  DrivePublicLinkPermissionSchema,
  DriveSearchScopeSchema,
  DriveSortOrderSchema,
  EmptyTrashOptionsSchema,
  FolderDownloadLinkOptionsSchema,
  HexColorSchema,
  ItemNameSchema,
  LabelNameSchema,
  ListByLabelOptionsSchema,
  ListFolderOptionsSchema,
  ListLabelsOptionsSchema,
  ListSharedWithMeOptionsSchema,
  ListTrashOptionsSchema,
  MoveFileSchema,
  MoveFolderSchema,
  RenameFileSchema,
  RenameFolderSchema,
  ResolvePublicLinkSchema,
  SearchOptionsSchema,
  UpdateFileSchema,
  UpdateFolderSchema,
  UpdatePublicLinkSchema,
  UpdateShareSchema,
  UploadFileSchema,
} from "./types";
export type { ResolvedPublicLink } from "./workflows/public-link";
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

export class DriveModule {
  readonly db_schema = dbSchema;
  readonly $name = "drive";
  readonly $dependencies: readonly string[] = [];

  private config: typeof DEFAULT_CONFIG;

  #pathService: PathService | null = null;
  #storageBridge: StorageBridge | null = null;
  #accessService: AccessService | null = null;
  #archiveService: ArchiveService | null = null;
  #searchService: SearchService | null = null;

  #folders: FolderWorkflow | null = null;
  #files: FileWorkflow | null = null;
  #labels: LabelWorkflow | null = null;
  #shares: ShareWorkflow | null = null;
  #publicLinks: PublicLinkWorkflow | null = null;
  #trash: TrashWorkflow | null = null;

  #pubsub: PubSubUnit | null = null;

  static create(config?: DriveModuleConfig): DriveModule {
    return new DriveModule(config ?? {});
  }

  constructor(config: DriveModuleConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  get folders(): FolderWorkflow {
    if (!this.#folders) throw notInitialized();
    return this.#folders;
  }

  get files(): FileWorkflow {
    if (!this.#files) throw notInitialized();
    return this.#files;
  }

  get labels(): LabelWorkflow {
    if (!this.#labels) throw notInitialized();
    return this.#labels;
  }

  get shares(): ShareWorkflow {
    if (!this.#shares) throw notInitialized();
    return this.#shares;
  }

  get publicLinks(): PublicLinkWorkflow {
    if (!this.#publicLinks) throw notInitialized();
    return this.#publicLinks;
  }

  get trash(): TrashWorkflow {
    if (!this.#trash) throw notInitialized();
    return this.#trash;
  }

  get search(): SearchService {
    if (!this.#searchService) throw notInitialized();
    return this.#searchService;
  }

  get archive(): ArchiveService {
    if (!this.#archiveService) throw notInitialized();
    return this.#archiveService;
  }

  get access(): AccessService {
    if (!this.#accessService) throw notInitialized();
    return this.#accessService;
  }

  get paths(): PathService {
    if (!this.#pathService) throw notInitialized();
    return this.#pathService;
  }

  $initialize(units: {
    db: DatabaseUnit;
    storage: StorageUnit;
    pubsub: PubSubUnit;
  }): void {
    const db = units.db.db;

    this.#pathService = new PathService(db, this.config.maxNestingDepth);
    this.#storageBridge = new StorageBridge(units.storage);
    this.#accessService = new AccessService(db);
    this.#archiveService = new ArchiveService(db, this.#storageBridge);
    this.#searchService = new SearchService(db);

    this.#folders = new FolderWorkflow(db, this.#pathService, units.pubsub);
    this.#files = new FileWorkflow(
      db,
      this.#storageBridge,
      this.#pathService,
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
    this.#publicLinks = new PublicLinkWorkflow(
      db,
      this.#accessService,
      units.pubsub,
    );
    this.#trash = new TrashWorkflow(db, this.#storageBridge, units.pubsub, {
      trashRetentionDays: this.config.trashRetentionDays,
    });

    this.#pubsub = units.pubsub;
  }

  $prepareInfra(): ModuleInfra {
    return {
      auth: { acl: {} },
      db: { schemas: dbSchema.driveTables },
      events: { drive: DRIVE_EVENTS },
    };
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

    this.#pathService = null;
    this.#storageBridge = null;
    this.#accessService = null;
    this.#archiveService = null;
    this.#searchService = null;
    this.#folders = null;
    this.#files = null;
    this.#labels = null;
    this.#shares = null;
    this.#publicLinks = null;
    this.#trash = null;
    this.#pubsub = null;
  }
}

function notInitialized(): Error {
  return new Error(
    "Drive module not initialized. Call $initialize() after Framework.create().",
  );
}
