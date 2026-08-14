import type {
  DatabaseUnit,
  Module,
  ModuleInfra,
  PubSubUnit,
  StorageUnit,
} from "@aspen-os/platform/server";

import { acl } from "./auth";
import { control_plane_schemas, tenant_schemas } from "./db-schemas";
import { events } from "./pubsub";
import { type DriveRuntimeConfig, setDriveConfig, setDriveStorage } from "./runtime";
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

export type { DriveModuleConfig };

import { copyFile } from "./workflows/file.copy";
import { deleteFile } from "./workflows/file.delete";
import { downloadFile } from "./workflows/file.download";
import { getFileDownloadLink } from "./workflows/file.download-link";
import { getFile, getFileById } from "./workflows/file.get";
import { listFileVersions } from "./workflows/file.list-versions";
import { moveFile } from "./workflows/file.move";
import { purgeFile } from "./workflows/file.purge";
import { renameFile } from "./workflows/file.rename";
import { restoreFile } from "./workflows/file.restore";
import { updateFile } from "./workflows/file.update";
import { uploadFile } from "./workflows/file.upload";
import { createFolder } from "./workflows/folder.create";
import { deleteFolder } from "./workflows/folder.delete";
import { getFolder } from "./workflows/folder.get";
import { getFolderById } from "./workflows/folder.get-by-id";
import { listFolders } from "./workflows/folder.list";
import { moveFolder } from "./workflows/folder.move";
import { renameFolder } from "./workflows/folder.rename";
import { restoreFolder } from "./workflows/folder.restore";
import { updateFolder } from "./workflows/folder.update";
import { applyLabel } from "./workflows/label.apply";
import { createLabel } from "./workflows/label.create";
import { deleteLabel } from "./workflows/label.delete";
import { listLabels } from "./workflows/label.list";
import { listByLabel } from "./workflows/label.list-by-label";
import { removeLabel } from "./workflows/label.remove";
import { createPublicLink } from "./workflows/public-link.create";
import { getPublicLinkById } from "./workflows/public-link.get";
import { listPublicLinks } from "./workflows/public-link.list";
import { resolvePublicLink } from "./workflows/public-link.resolve";
import { revokePublicLink } from "./workflows/public-link.revoke";
import { updatePublicLink } from "./workflows/public-link.update";
import { createShare } from "./workflows/share.create";
import { getShareById } from "./workflows/share.get";
import { listShares } from "./workflows/share.list";
import { listSharedWithMe } from "./workflows/share.list-shared-with-me";
import { removeShare } from "./workflows/share.remove";
import { updateShare } from "./workflows/share.update";
import { emptyTrash } from "./workflows/trash.empty";
import { listTrash } from "./workflows/trash.list";
import { purgeExpired } from "./workflows/trash.purge-expired";
import { restoreFromTrash } from "./workflows/trash.restore";
import { purgeExpiredInternal } from "./workflows/utils";

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
  static create(config?: DriveModuleConfig): Drive {
    return new Drive(config ?? {});
  }

  readonly $name = "drive";
  readonly $dependencies: readonly string[] = [];
  readonly $config: DriveRuntimeConfig;

  #pubsub: PubSubUnit | null = null;

  constructor(config: DriveModuleConfig) {
    this.$config = { ...DEFAULT_CONFIG, ...config };
    setDriveConfig(this.$config);
  }

  $prepareInfra(): ModuleInfra {
    return {
      auth: { acl },
      db: { control_plane_schemas, tenant_schemas },
      events,
    };
  }

  $initialize(units: { db: DatabaseUnit; storage: StorageUnit; pubsub: PubSubUnit }): void {
    this.#pubsub = units.pubsub;
    setDriveStorage(units.storage);
    void units.db;
  }

  async $prepareRuntime(): Promise<void> {
    if (!this.#pubsub) {
      return;
    }

    await this.#pubsub.subscribe(PURGE_TOPIC, async () => {
      await purgeExpiredInternal();
    });

    await this.#pubsub.schedule({ cron: PURGE_CRON, topic: PURGE_TOPIC });
  }

  async $cleanup(): Promise<void> {
    if (this.#pubsub) {
      try {
        await this.#pubsub.unsubscribe(PURGE_TOPIC);
        await this.#pubsub.unschedule(PURGE_TOPIC);
      } catch {
        // Ignore
      }
    }

    this.#pubsub = null;
  }

  readonly files = {
    copy: copyFile,
    delete: deleteFile,
    download: downloadFile,
    get: getFile,
    getById: getFileById,
    getDownloadLink: getFileDownloadLink,
    listVersions: listFileVersions,
    move: moveFile,
    purge: purgeFile,
    rename: renameFile,
    restore: restoreFile,
    update: updateFile,
    upload: uploadFile,
  };

  readonly folders = {
    create: createFolder,
    delete: deleteFolder,
    get: getFolder,
    getById: getFolderById,
    list: listFolders,
    move: moveFolder,
    rename: renameFolder,
    restore: restoreFolder,
    update: updateFolder,
  };

  readonly labels = {
    apply: applyLabel,
    create: createLabel,
    delete: deleteLabel,
    list: listLabels,
    listByLabel,
    remove: removeLabel,
  };

  readonly publicLinks = {
    create: createPublicLink,
    get: getPublicLinkById,
    list: listPublicLinks,
    resolve: resolvePublicLink,
    revoke: revokePublicLink,
    update: updatePublicLink,
  };

  readonly shares = {
    create: createShare,
    get: getShareById,
    list: listShares,
    listSharedWithMe,
    remove: removeShare,
    update: updateShare,
  };

  readonly trash = {
    emptyTrash,
    list: listTrash,
    purgeExpired,
    restore: restoreFromTrash,
  };

  readonly access = {
    checkPermission: (input: Parameters<typeof checkPermission>[0]) => checkPermission(input),
    getEffectivePermission: (input: Parameters<typeof getEffectivePermission>[0]) =>
      getEffectivePermission(input),
    isOwner: (input: Parameters<typeof isOwner>[0]) => isOwner(input),
    logAccess: (input: Parameters<typeof logAccess>[0]) => logAccess(input),
  };

  readonly archive = {
    createArchive: (input: Parameters<typeof createArchive>[0]) => createArchive(input),
    processArchiveJob: (input: Parameters<typeof processArchiveJob>[0]) => processArchiveJob(input),
  };

  readonly paths = {
    checkNameUniqueness: (input: Parameters<typeof checkNameUniqueness>[0]) =>
      checkNameUniqueness(input),
    computeFilePath: (input: Parameters<typeof computeFilePath>[0]) => computeFilePath(input),
    computeFolderPath: (input: Parameters<typeof computeFolderPath>[0]) => computeFolderPath(input),
    getBreadcrumbs: (input: Parameters<typeof getBreadcrumbs>[0]) => getBreadcrumbs(input),
    getDepth: (input: Parameters<typeof getDepth>[0]) => getDepth(input),
    getFilePath: (input: Parameters<typeof getFilePath>[0]) => getFilePath(input),
    getFolderPath: (input: Parameters<typeof getFolderPath>[0]) => getFolderPath(input),
    getSubtreeMaxDepth: (input: Parameters<typeof getSubtreeMaxDepth>[0]) =>
      getSubtreeMaxDepth(input),
    resolvePath: (input: Parameters<typeof resolvePath>[0]) => resolvePath(input),
    wouldCreateCycle: (input: Parameters<typeof wouldCreateCycle>[0]) => wouldCreateCycle(input),
  };

  readonly search = {
    search: (input: Parameters<typeof search>[0]) => search(input),
  };

  readonly storage = {
    computeArchiveKey: (input: Parameters<typeof computeArchiveKey>[0]) => computeArchiveKey(input),
    computeStorageKey: (input: Parameters<typeof computeStorageKey>[0]) => computeStorageKey(input),
    copy: (input: Parameters<typeof copyStorage>[0]) => copyStorage(input),
    exists: (input: Parameters<typeof existsStorage>[0]) => existsStorage(input),
    get: (input: Parameters<typeof getStorage>[0]) => getStorage(input),
    getSignedGetUrl: (input: Parameters<typeof getSignedGetUrl>[0]) => getSignedGetUrl(input),
    move: (input: Parameters<typeof moveStorage>[0]) => moveStorage(input),
    remove: (input: Parameters<typeof removeStorage>[0]) => removeStorage(input),
    upload: (input: Parameters<typeof uploadStorage>[0]) => uploadStorage(input),
  };
}
