import {
  checkPermission,
  getEffectivePermission,
  isOwner,
  logAccess,
} from "../services/item-access-service";
import {
  createArchive,
  processArchiveJob,
} from "../services/item-archive-service";
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
} from "../services/item-path-service";
import { searchItems } from "../services/item-search-service";
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
} from "../services/item-storage-bridge";
import { copyItemFile } from "./item-file.copy";
import { deleteItemFile } from "./item-file.delete";
import { downloadItemFile } from "./item-file.download";
import { getItemFileDownloadLink } from "./item-file.download-link";
import { getItemFile, getItemFileById } from "./item-file.get";
import { listItemFileVersions } from "./item-file.list-versions";
import { moveItemFile } from "./item-file.move";
import { purgeItemFile } from "./item-file.purge";
import { renameItemFile } from "./item-file.rename";
import { restoreItemFile } from "./item-file.restore";
import { updateItemFile } from "./item-file.update";
import { uploadItemFile } from "./item-file.upload";
import { createItemFolder } from "./item-folder.create";
import { deleteItemFolder } from "./item-folder.delete";
import { getItemFolder } from "./item-folder.get";
import { getItemFolderById } from "./item-folder.get-by-id";
import { listItemFolders } from "./item-folder.list";
import { moveItemFolder } from "./item-folder.move";
import { renameItemFolder } from "./item-folder.rename";
import { restoreItemFolder } from "./item-folder.restore";
import { updateItemFolder } from "./item-folder.update";
import { applyItemLabel } from "./item-label.apply";
import { createItemLabel } from "./item-label.create";
import { deleteItemLabel } from "./item-label.delete";
import { listItemLabels } from "./item-label.list";
import { listItemsByLabel } from "./item-label.list-by-label";
import { removeItemLabel } from "./item-label.remove";
import { createItemPublicLink } from "./item-public-link.create";
import { getItemPublicLinkById } from "./item-public-link.get";
import { listItemPublicLinks } from "./item-public-link.list";
import { resolveItemPublicLink } from "./item-public-link.resolve";
import { revokeItemPublicLink } from "./item-public-link.revoke";
import { updateItemPublicLink } from "./item-public-link.update";
import { createItemShare } from "./item-share.create";
import { getItemShareById } from "./item-share.get";
import { listItemShares } from "./item-share.list";
import { listSharedWithMe } from "./item-share.list-shared-with-me";
import { removeItemShare } from "./item-share.remove";
import { updateItemShare } from "./item-share.update";
import { emptyItemTrash } from "./item-trash.empty";
import { listItemTrash } from "./item-trash.list";
import { purgeExpiredItemTrash } from "./item-trash.purge-expired";
import { restoreItemFromTrash } from "./item-trash.restore";

export const files = {
  copy: copyItemFile,
  delete: deleteItemFile,
  download: downloadItemFile,
  get: getItemFile,
  getById: getItemFileById,
  getDownloadLink: getItemFileDownloadLink,
  listVersions: listItemFileVersions,
  move: moveItemFile,
  purge: purgeItemFile,
  rename: renameItemFile,
  restore: restoreItemFile,
  update: updateItemFile,
  upload: uploadItemFile,
} as const;

export const folders = {
  create: createItemFolder,
  delete: deleteItemFolder,
  get: getItemFolder,
  getById: getItemFolderById,
  list: listItemFolders,
  move: moveItemFolder,
  rename: renameItemFolder,
  restore: restoreItemFolder,
  update: updateItemFolder,
} as const;

export const labels = {
  apply: applyItemLabel,
  create: createItemLabel,
  delete: deleteItemLabel,
  list: listItemLabels,
  listByLabel: listItemsByLabel,
  remove: removeItemLabel,
} as const;

export const publicLinks = {
  create: createItemPublicLink,
  get: getItemPublicLinkById,
  list: listItemPublicLinks,
  resolve: resolveItemPublicLink,
  revoke: revokeItemPublicLink,
  update: updateItemPublicLink,
} as const;

export const shares = {
  create: createItemShare,
  get: getItemShareById,
  list: listItemShares,
  listSharedWithMe,
  remove: removeItemShare,
  update: updateItemShare,
} as const;

export const trash = {
  emptyTrash: emptyItemTrash,
  list: listItemTrash,
  purgeExpired: purgeExpiredItemTrash,
  restore: restoreItemFromTrash,
} as const;

export const driveSearch = {
  search: (input: Parameters<typeof searchItems>[0]) => searchItems(input),
} as const;

export const access = {
  checkPermission: (input: Parameters<typeof checkPermission>[0]) =>
    checkPermission(input),
  getEffectivePermission: (
    input: Parameters<typeof getEffectivePermission>[0],
  ) => getEffectivePermission(input),
  isOwner: (input: Parameters<typeof isOwner>[0]) => isOwner(input),
  logAccess: (input: Parameters<typeof logAccess>[0]) => logAccess(input),
} as const;

export const archive = {
  createArchive: (input: Parameters<typeof createArchive>[0]) =>
    createArchive(input),
  processArchiveJob: (input: Parameters<typeof processArchiveJob>[0]) =>
    processArchiveJob(input),
} as const;

export const paths = {
  checkNameUniqueness: (input: Parameters<typeof checkNameUniqueness>[0]) =>
    checkNameUniqueness(input),
  computeFilePath: (input: Parameters<typeof computeFilePath>[0]) =>
    computeFilePath(input),
  computeFolderPath: (input: Parameters<typeof computeFolderPath>[0]) =>
    computeFolderPath(input),
  getBreadcrumbs: (input: Parameters<typeof getBreadcrumbs>[0]) =>
    getBreadcrumbs(input),
  getDepth: (input: Parameters<typeof getDepth>[0]) => getDepth(input),
  getFilePath: (input: Parameters<typeof getFilePath>[0]) => getFilePath(input),
  getFolderPath: (input: Parameters<typeof getFolderPath>[0]) =>
    getFolderPath(input),
  getSubtreeMaxDepth: (input: Parameters<typeof getSubtreeMaxDepth>[0]) =>
    getSubtreeMaxDepth(input),
  resolvePath: (input: Parameters<typeof resolvePath>[0]) => resolvePath(input),
  wouldCreateCycle: (input: Parameters<typeof wouldCreateCycle>[0]) =>
    wouldCreateCycle(input),
} as const;

export const storage = {
  computeArchiveKey: (input: Parameters<typeof computeArchiveKey>[0]) =>
    computeArchiveKey(input),
  computeStorageKey: (input: Parameters<typeof computeStorageKey>[0]) =>
    computeStorageKey(input),
  copy: (input: Parameters<typeof copyStorage>[0]) => copyStorage(input),
  exists: (input: Parameters<typeof existsStorage>[0]) => existsStorage(input),
  get: (input: Parameters<typeof getStorage>[0]) => getStorage(input),
  getSignedGetUrl: (input: Parameters<typeof getSignedGetUrl>[0]) =>
    getSignedGetUrl(input),
  move: (input: Parameters<typeof moveStorage>[0]) => moveStorage(input),
  remove: (input: Parameters<typeof removeStorage>[0]) => removeStorage(input),
  upload: (input: Parameters<typeof uploadStorage>[0]) => uploadStorage(input),
} as const;
