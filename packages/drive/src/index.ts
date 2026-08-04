import type {
  DatabaseUnit,
  Module,
  ModuleInfra,
  PubSubUnit,
  StorageUnit,
} from "@aspen-os/platform/server";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import * as dbSchema from "./db-schema";
import { control_plane_schemas, tenant_schemas } from "./db-schemas";
import { events } from "./pubsub-events";
import type { DriveModuleConfig } from "./types";
import { acl } from "./utils/acl";

export type { DriveEventMap } from "./pubsub-events";
export { DRIVE_EVENTS } from "./pubsub-events";
export type { ArchiveJobData, ArchiveResult } from "./services/archive-service";
export { ArchiveTooLargeError } from "./services/archive-service";
export * from "./types";
export type { ResolvedPublicLink } from "./workflows/public-link";
export { dbSchema };

import {
  type AccessServiceDeps,
  checkPermission,
  getEffectivePermission,
  isOwner,
  logAccess,
} from "./services/access-service";
import {
  type ArchiveServiceDeps,
  createArchive,
  processArchiveJob,
} from "./services/archive-service";
import {
  checkNameUniqueness,
  computeFilePath,
  computeFolderPath,
  getBreadcrumbs,
  getDepth,
  getFilePath,
  getFolderPath,
  getSubtreeMaxDepth,
  type PathServiceDeps,
  resolvePath,
  wouldCreateCycle,
} from "./services/path-service";
import { type SearchServiceDeps, search } from "./services/search-service";
import {
  computeArchiveKey,
  computeStorageKey,
  copy as copyStorage,
  exists as existsStorage,
  getSignedGetUrl,
  get as getStorage,
  move as moveStorage,
  remove as removeStorage,
  type StorageBridgeDeps,
  upload as uploadStorage,
} from "./services/storage-bridge";
import {
  copyFile,
  deleteFile,
  downloadFile,
  type FileDeps,
  getFile,
  getFileById,
  getFileDownloadLink,
  listFileVersions,
  moveFile,
  purgeFile,
  renameFile,
  restoreFile,
  updateFile,
  uploadFile,
} from "./workflows/file";
import {
  createFolder,
  deleteFolder,
  type FolderDeps,
  getFolder,
  getFolderById,
  listFolders,
  moveFolder,
  renameFolder,
  restoreFolder,
  updateFolder,
} from "./workflows/folder";
import {
  applyLabel,
  createLabel,
  deleteLabel,
  type LabelDeps,
  listByLabel,
  listLabels,
  removeLabel,
} from "./workflows/label";
import {
  createPublicLink,
  getPublicLinkById,
  listPublicLinks,
  type PublicLinkDeps,
  resolvePublicLink,
  revokePublicLink,
  updatePublicLink,
} from "./workflows/public-link";
import {
  createShare,
  getShareById,
  listSharedWithMe,
  listShares,
  removeShare,
  type ShareDeps,
  updateShare,
} from "./workflows/share";
import {
  emptyTrash,
  listTrash,
  purgeExpired,
  restoreFromTrash,
  type TrashDeps,
} from "./workflows/trash";

type DrizzleDB = NodePgDatabase<Record<string, never>>;

export interface DriveDeps {
  config: Required<DriveModuleConfig>;
  db: DrizzleDB;
  pubsub: PubSubUnit;
  storage: StorageUnit;
}

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
  readonly config: Required<DriveModuleConfig>;

  #db: DatabaseUnit | null = null;
  #pubsub: PubSubUnit | null = null;
  #storage: StorageUnit | null = null;

  static create(config?: DriveModuleConfig): Drive {
    return new Drive(config ?? {});
  }

  constructor(config: DriveModuleConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
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
    this.#db = units.db;
    this.#storage = units.storage;
    this.#pubsub = units.pubsub;
  }

  async $prepareRuntime(): Promise<void> {
    if (!this.#pubsub || !this.#db || !this.#storage) return;

    const trashDeps: TrashDeps = {
      config: { trashRetentionDays: this.config.trashRetentionDays },
      db: this.#db.db,
      pubsub: this.#pubsub,
      storageDeps: { storage: this.#storage },
    };

    await this.#pubsub.subscribe(PURGE_TOPIC, async () => {
      await purgeExpired({}, trashDeps);
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

    this.#db = null;
    this.#storage = null;
    this.#pubsub = null;
  }

  #buildDeps(): DriveDeps {
    if (!this.#db || !this.#storage || !this.#pubsub) {
      throw new Error("Drive not initialized");
    }
    return {
      config: this.config,
      db: this.#db.db,
      pubsub: this.#pubsub,
      storage: this.#storage,
    };
  }

  get _() {
    if (!this.#db || !this.#storage || !this.#pubsub)
      throw new Error("Drive not initialized");

    const deps = this.#buildDeps();
    const pathDeps: PathServiceDeps = {
      db: deps.db,
      maxDepth: this.config.maxNestingDepth,
    };
    const storageDeps: StorageBridgeDeps = { storage: deps.storage };
    const accessDeps: AccessServiceDeps = { db: deps.db };
    const searchDeps: SearchServiceDeps = { db: deps.db };
    const archiveDeps: ArchiveServiceDeps = {
      db: deps.db,
      storageDeps,
    };
    const folderDeps: FolderDeps = {
      db: deps.db,
      pathDeps,
      pubsub: deps.pubsub,
    };
    const fileDeps: FileDeps = {
      config: {
        allowedContentTypes: this.config.allowedContentTypes,
        defaultDownloadLinkExpiry: this.config.defaultDownloadLinkExpiry,
        maxDownloadLinkExpiry: this.config.maxDownloadLinkExpiry,
        maxFileSize: this.config.maxFileSize,
        maxVersions: this.config.maxVersions,
      },
      db: deps.db,
      pathDeps,
      pubsub: deps.pubsub,
      storageDeps,
    };
    const labelDeps: LabelDeps = { db: deps.db };
    const shareDeps: ShareDeps = {
      db: deps.db,
      pubsub: deps.pubsub,
    };
    const publicLinkDeps: PublicLinkDeps = {
      accessDeps,
      db: deps.db,
      pubsub: deps.pubsub,
    };
    const trashDeps: TrashDeps = {
      config: {
        trashRetentionDays: this.config.trashRetentionDays,
      },
      db: deps.db,
      pubsub: deps.pubsub,
      storageDeps,
    };

    return {
      access: {
        checkPermission: (input: Parameters<typeof checkPermission>[0]) =>
          checkPermission(input, accessDeps),
        getEffectivePermission: (
          input: Parameters<typeof getEffectivePermission>[0],
        ) => getEffectivePermission(input, accessDeps),
        isOwner: (input: Parameters<typeof isOwner>[0]) =>
          isOwner(input, accessDeps),
        logAccess: (input: Parameters<typeof logAccess>[0]) =>
          logAccess(input, accessDeps),
      },
      archive: {
        createArchive: (input: Parameters<typeof createArchive>[0]) =>
          createArchive(input, archiveDeps),
        processArchiveJob: (input: Parameters<typeof processArchiveJob>[0]) =>
          processArchiveJob(input, archiveDeps),
      },
      files: {
        copy: (input: Parameters<typeof copyFile>[0]) =>
          copyFile(input, fileDeps),
        delete: (input: Parameters<typeof deleteFile>[0]) =>
          deleteFile(input, fileDeps),
        download: (input: Parameters<typeof downloadFile>[0]) =>
          downloadFile(input, fileDeps),
        get: (input: Parameters<typeof getFile>[0]) => getFile(input, fileDeps),
        getById: (input: Parameters<typeof getFileById>[0]) =>
          getFileById(input, { db: deps.db }),
        getDownloadLink: (input: Parameters<typeof getFileDownloadLink>[0]) =>
          getFileDownloadLink(input, fileDeps),
        listVersions: (input: Parameters<typeof listFileVersions>[0]) =>
          listFileVersions(input, fileDeps),
        move: (input: Parameters<typeof moveFile>[0]) =>
          moveFile(input, fileDeps),
        purge: (input: Parameters<typeof purgeFile>[0]) =>
          purgeFile(input, fileDeps),
        rename: (input: Parameters<typeof renameFile>[0]) =>
          renameFile(input, fileDeps),
        restore: (input: Parameters<typeof restoreFile>[0]) =>
          restoreFile(input, fileDeps),
        update: (input: Parameters<typeof updateFile>[0]) =>
          updateFile(input, fileDeps),
        upload: (input: Parameters<typeof uploadFile>[0]) =>
          uploadFile(input, fileDeps),
      },
      folders: {
        create: (input: Parameters<typeof createFolder>[0]) =>
          createFolder(input, folderDeps),
        delete: (input: Parameters<typeof deleteFolder>[0]) =>
          deleteFolder(input, folderDeps),
        get: (input: Parameters<typeof getFolder>[0]) =>
          getFolder(input, folderDeps),
        getById: (input: Parameters<typeof getFolderById>[0]) =>
          getFolderById(input, { db: deps.db }),
        list: (input: Parameters<typeof listFolders>[0]) =>
          listFolders(input, folderDeps),
        move: (input: Parameters<typeof moveFolder>[0]) =>
          moveFolder(input, folderDeps),
        rename: (input: Parameters<typeof renameFolder>[0]) =>
          renameFolder(input, folderDeps),
        restore: (input: Parameters<typeof restoreFolder>[0]) =>
          restoreFolder(input, folderDeps),
        update: (input: Parameters<typeof updateFolder>[0]) =>
          updateFolder(input, folderDeps),
      },
      labels: {
        apply: (input: Parameters<typeof applyLabel>[0]) =>
          applyLabel(input, labelDeps),
        create: (input: Parameters<typeof createLabel>[0]) =>
          createLabel(input, labelDeps),
        delete: (input: Parameters<typeof deleteLabel>[0]) =>
          deleteLabel(input, labelDeps),
        list: (input: Parameters<typeof listLabels>[0]) =>
          listLabels(input, labelDeps),
        listByLabel: (input: Parameters<typeof listByLabel>[0]) =>
          listByLabel(input, labelDeps),
        remove: (input: Parameters<typeof removeLabel>[0]) =>
          removeLabel(input, labelDeps),
      },
      paths: {
        checkNameUniqueness: (
          input: Parameters<typeof checkNameUniqueness>[0],
        ) => checkNameUniqueness(input, pathDeps),
        computeFilePath: (input: Parameters<typeof computeFilePath>[0]) =>
          computeFilePath(input, pathDeps),
        computeFolderPath: (input: Parameters<typeof computeFolderPath>[0]) =>
          computeFolderPath(input, pathDeps),
        getBreadcrumbs: (input: Parameters<typeof getBreadcrumbs>[0]) =>
          getBreadcrumbs(input, pathDeps),
        getDepth: (input: Parameters<typeof getDepth>[0]) =>
          getDepth(input, pathDeps),
        getFilePath: (input: Parameters<typeof getFilePath>[0]) =>
          getFilePath(input, pathDeps),
        getFolderPath: (input: Parameters<typeof getFolderPath>[0]) =>
          getFolderPath(input, pathDeps),
        getSubtreeMaxDepth: (input: Parameters<typeof getSubtreeMaxDepth>[0]) =>
          getSubtreeMaxDepth(input, pathDeps),
        resolvePath: (input: Parameters<typeof resolvePath>[0]) =>
          resolvePath(input, pathDeps),
        wouldCreateCycle: (input: Parameters<typeof wouldCreateCycle>[0]) =>
          wouldCreateCycle(input, pathDeps),
      },
      publicLinks: {
        create: (input: Parameters<typeof createPublicLink>[0]) =>
          createPublicLink(input, publicLinkDeps),
        get: (input: Parameters<typeof getPublicLinkById>[0]) =>
          getPublicLinkById(input, publicLinkDeps),
        list: (input: Parameters<typeof listPublicLinks>[0]) =>
          listPublicLinks(input, publicLinkDeps),
        resolve: (input: Parameters<typeof resolvePublicLink>[0]) =>
          resolvePublicLink(input, publicLinkDeps),
        revoke: (input: Parameters<typeof revokePublicLink>[0]) =>
          revokePublicLink(input, publicLinkDeps),
        update: (input: Parameters<typeof updatePublicLink>[0]) =>
          updatePublicLink(input, publicLinkDeps),
      },
      search: {
        search: (input: Parameters<typeof search>[0]) =>
          search(input, searchDeps),
      },
      shares: {
        create: (input: Parameters<typeof createShare>[0]) =>
          createShare(input, shareDeps),
        get: (input: Parameters<typeof getShareById>[0]) =>
          getShareById(input, shareDeps),
        list: (input: Parameters<typeof listShares>[0]) =>
          listShares(input, shareDeps),
        listSharedWithMe: (input: Parameters<typeof listSharedWithMe>[0]) =>
          listSharedWithMe(input, shareDeps),
        remove: (input: Parameters<typeof removeShare>[0]) =>
          removeShare(input, shareDeps),
        update: (input: Parameters<typeof updateShare>[0]) =>
          updateShare(input, shareDeps),
      },
      storage: {
        computeArchiveKey: (input: Parameters<typeof computeArchiveKey>[0]) =>
          computeArchiveKey(input),
        computeStorageKey: (input: Parameters<typeof computeStorageKey>[0]) =>
          computeStorageKey(input),
        copy: (input: Parameters<typeof copyStorage>[0]) =>
          copyStorage(input, storageDeps),
        exists: (input: Parameters<typeof existsStorage>[0]) =>
          existsStorage(input, storageDeps),
        get: (input: Parameters<typeof getStorage>[0]) =>
          getStorage(input, storageDeps),
        getSignedGetUrl: (input: Parameters<typeof getSignedGetUrl>[0]) =>
          getSignedGetUrl(input, storageDeps),
        move: (input: Parameters<typeof moveStorage>[0]) =>
          moveStorage(input, storageDeps),
        remove: (input: Parameters<typeof removeStorage>[0]) =>
          removeStorage(input, storageDeps),
        upload: (input: Parameters<typeof uploadStorage>[0]) =>
          uploadStorage(input, storageDeps),
      },
      trash: {
        emptyTrash: (input: Parameters<typeof emptyTrash>[0]) =>
          emptyTrash(input, trashDeps),
        list: (input: Parameters<typeof listTrash>[0]) =>
          listTrash(input, trashDeps),
        purgeExpired: (input: Parameters<typeof purgeExpired>[0]) =>
          purgeExpired(input, trashDeps),
        restore: (input: Parameters<typeof restoreFromTrash>[0]) =>
          restoreFromTrash(input, trashDeps),
      },
    };
  }
}
