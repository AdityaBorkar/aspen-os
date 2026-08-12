import { getDmsStorage } from "../runtime";

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
  documentId: string;
  name: string;
  tenantId?: string;
  version: number;
}): string {
  const safeName = input.name.replace(/[\\/]+/g, "_").replace(/\0/g, "");
  const tenant = input.tenantId ?? "default";
  return `dms/${tenant}/${input.documentId}/v${input.version}/${safeName}`;
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
