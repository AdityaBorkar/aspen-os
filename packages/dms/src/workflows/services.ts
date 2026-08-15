import {
  checkPermission,
  getEffectivePermission,
  isOwner,
  logAccess,
} from "#/services/access-service";
import { createArchive, processArchiveJob } from "#/services/archive-service";
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
} from "#/services/path-service";
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

export const access = {
  checkPermission: async (input: Parameters<typeof checkPermission>[0]) => checkPermission(input),
  getEffectivePermission: async (input: Parameters<typeof getEffectivePermission>[0]) =>
    getEffectivePermission(input),
  isOwner: async (input: Parameters<typeof isOwner>[0]) => isOwner(input),
  logAccess: async (input: Parameters<typeof logAccess>[0]) => logAccess(input),
} as const;

export const archive = {
  createArchive: async (input: Parameters<typeof createArchive>[0]) => createArchive(input),
  processArchiveJob: async (input: Parameters<typeof processArchiveJob>[0]) =>
    processArchiveJob(input),
} as const;

export const paths = {
  checkNameUniqueness: async (input: Parameters<typeof checkNameUniqueness>[0]) =>
    checkNameUniqueness(input),
  computeFilePath: async (input: Parameters<typeof computeFilePath>[0]) => computeFilePath(input),
  computeFolderPath: async (input: Parameters<typeof computeFolderPath>[0]) =>
    computeFolderPath(input),
  getBreadcrumbs: async (input: Parameters<typeof getBreadcrumbs>[0]) => getBreadcrumbs(input),
  getDepth: async (input: Parameters<typeof getDepth>[0]) => getDepth(input),
  getFilePath: async (input: Parameters<typeof getFilePath>[0]) => getFilePath(input),
  getFolderPath: async (input: Parameters<typeof getFolderPath>[0]) => getFolderPath(input),
  getSubtreeMaxDepth: async (input: Parameters<typeof getSubtreeMaxDepth>[0]) =>
    getSubtreeMaxDepth(input),
  resolvePath: async (input: Parameters<typeof resolvePath>[0]) => resolvePath(input),
  wouldCreateCycle: async (input: Parameters<typeof wouldCreateCycle>[0]) =>
    wouldCreateCycle(input),
} as const;

export const storage = {
  computeArchiveKey: (input: Parameters<typeof computeArchiveKey>[0]) => computeArchiveKey(input),
  computeStorageKey: (input: Parameters<typeof computeStorageKey>[0]) => computeStorageKey(input),
  copy: async (input: Parameters<typeof copyStorage>[0]) => copyStorage(input),
  exists: async (input: Parameters<typeof existsStorage>[0]) => existsStorage(input),
  get: async (input: Parameters<typeof getStorage>[0]) => getStorage(input),
  getSignedGetUrl: async (input: Parameters<typeof getSignedGetUrl>[0]) => getSignedGetUrl(input),
  move: async (input: Parameters<typeof moveStorage>[0]) => moveStorage(input),
  remove: async (input: Parameters<typeof removeStorage>[0]) => removeStorage(input),
  upload: async (input: Parameters<typeof uploadStorage>[0]) => uploadStorage(input),
} as const;
