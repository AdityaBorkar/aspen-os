import type { StorageUnit } from "@aspen-os/platform/server";

import { getDriveStorage } from "../runtime";

export interface FileObject {
  contentType?: string;
  etag: string;
  key: string;
  lastModified: Date;
  metadata?: Record<string, string>;
  size: number;
}

export interface UploadBridgeInput {
  body: Buffer | ReadableStream | string;
  contentType?: string;
  key: string;
  metadata?: Record<string, string>;
}

export function computeStorageKey({
  folderPath,
  fileName,
}: {
  folderPath: string;
  fileName: string;
}): string {
  const uuid = crypto.randomUUID();
  const sanitized = folderPath.startsWith("/")
    ? folderPath.slice(1)
    : folderPath;
  const cleanPath = sanitized || "_root";
  return `${cleanPath}/${fileName}-${uuid}`;
}

export function computeArchiveKey({ folderId }: { folderId: string }): string {
  const uuid = crypto.randomUUID();
  return `archives/${folderId}/${uuid}.zip`;
}

function storage(): StorageUnit {
  return getDriveStorage();
}

export async function upload(input: UploadBridgeInput): Promise<FileObject> {
  return storage().upload(input);
}

export async function getSignedGetUrl({
  key,
  expiresIn,
}: {
  key: string;
  expiresIn?: number;
}): Promise<string> {
  return storage().getSignedGetUrl(key, { expiresIn });
}

export async function copy({
  sourceKey,
  destKey,
}: {
  sourceKey: string;
  destKey: string;
}): Promise<FileObject> {
  return storage().copy(sourceKey, destKey);
}

export async function move({
  sourceKey,
  destKey,
}: {
  sourceKey: string;
  destKey: string;
}): Promise<FileObject> {
  return storage().move(sourceKey, destKey);
}

export async function remove({ key }: { key: string }): Promise<void> {
  return storage().remove(key);
}

export async function get({ key }: { key: string }): Promise<Buffer> {
  return storage().get(key);
}

export async function exists({ key }: { key: string }): Promise<boolean> {
  return storage().exists(key);
}
