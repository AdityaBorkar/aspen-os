import { getDmsStorage } from "#/runtime";

export interface DmsFileObject {
  contentType?: string;
  etag: string;
  key: string;
  lastModified: Date;
  metadata?: Record<string, string>;
  size: number;
}

export interface DmsUploadInput {
  body: Buffer | ReadableStream | string;
  contentType?: string;
  key: string;
  metadata?: Record<string, string>;
}

export function computeStorageKey(input: {
  fileId: string;
  name: string;
  tenantId?: string;
  version: number;
}): string {
  const safeName = input.name.replaceAll(/[\\/]+/g, "_").replaceAll("\0", "");
  const tenant = input.tenantId ?? "default";
  return `dms/${tenant}/${input.fileId}/v${input.version}/${safeName}`;
}

export function computeArchiveKey({ folderId }: { folderId: string }): string {
  const uuid = crypto.randomUUID();
  return `archives/${folderId}/${uuid}.zip`;
}

export async function upload(input: DmsUploadInput): Promise<DmsFileObject> {
  return getDmsStorage().upload(input);
}

export async function getSignedGetUrl({
  expiresIn,
  key,
}: {
  expiresIn?: number;
  key: string;
}): Promise<string> {
  return getDmsStorage().getSignedGetUrl(key, { expiresIn });
}

export async function get({ key }: { key: string }): Promise<Buffer> {
  return getDmsStorage().get(key);
}

export async function remove({ key }: { key: string }): Promise<void> {
  await getDmsStorage().remove(key);
}

export async function copy({
  sourceKey,
  destKey,
}: {
  sourceKey: string;
  destKey: string;
}): Promise<DmsFileObject> {
  return getDmsStorage().copy(sourceKey, destKey);
}

export async function move({
  sourceKey,
  destKey,
}: {
  sourceKey: string;
  destKey: string;
}): Promise<DmsFileObject> {
  return getDmsStorage().move(sourceKey, destKey);
}

export async function exists({ key }: { key: string }): Promise<boolean> {
  return getDmsStorage().exists(key);
}
