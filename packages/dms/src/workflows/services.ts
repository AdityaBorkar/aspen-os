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
} from "#/services/storage-bridge";
import {
  checkPermission,
  getEffectivePermission,
  isOwner,
  logAccess,
} from "#/workflow-steps/access-service";
import { createArchive, processArchiveJob } from "#/workflow-steps/archive-service";
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
} from "#/workflow-steps/path-service";

export const access = {
  checkPermission,
  getEffectivePermission,
  isOwner,
  logAccess,
} as const;

export const archive = { createArchive, processArchiveJob } as const;

export const paths = {
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
} as const;

export const storage = {
  computeArchiveKey,
  computeStorageKey,
  copy: copyStorage,
  exists: existsStorage,
  get: getStorage,
  getSignedGetUrl,
  move: moveStorage,
  remove: removeStorage,
  upload: uploadStorage,
} as const;
