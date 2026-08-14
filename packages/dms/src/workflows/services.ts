import {
  checkPermission,
  getEffectivePermission,
  isOwner,
  logAccess,
} from "../services/access-service";
import { createArchive, processArchiveJob } from "../services/archive-service";
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
} from "../services/path-service";
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
} from "../services/storage-bridge";

export const access = {
  checkPermission: (input: Parameters<typeof checkPermission>[0]) => checkPermission(input),
  getEffectivePermission: (input: Parameters<typeof getEffectivePermission>[0]) =>
    getEffectivePermission(input),
  isOwner: (input: Parameters<typeof isOwner>[0]) => isOwner(input),
  logAccess: (input: Parameters<typeof logAccess>[0]) => logAccess(input),
} as const;

export const archive = {
  createArchive: (input: Parameters<typeof createArchive>[0]) => createArchive(input),
  processArchiveJob: (input: Parameters<typeof processArchiveJob>[0]) => processArchiveJob(input),
} as const;

export const paths = {
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
} as const;

export const storage = {
  computeArchiveKey: (input: Parameters<typeof computeArchiveKey>[0]) => computeArchiveKey(input),
  computeStorageKey: (input: Parameters<typeof computeStorageKey>[0]) => computeStorageKey(input),
  copy: (input: Parameters<typeof copyStorage>[0]) => copyStorage(input),
  exists: (input: Parameters<typeof existsStorage>[0]) => existsStorage(input),
  get: (input: Parameters<typeof getStorage>[0]) => getStorage(input),
  getSignedGetUrl: (input: Parameters<typeof getSignedGetUrl>[0]) => getSignedGetUrl(input),
  move: (input: Parameters<typeof moveStorage>[0]) => moveStorage(input),
  remove: (input: Parameters<typeof removeStorage>[0]) => removeStorage(input),
  upload: (input: Parameters<typeof uploadStorage>[0]) => uploadStorage(input),
} as const;
