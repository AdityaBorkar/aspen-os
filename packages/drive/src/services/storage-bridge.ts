import type { StorageUnit } from "@aspen-os/platform/server";

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

export class StorageBridge {
  constructor(private storage: StorageUnit) {}

  computeStorageKey(folderPath: string, fileName: string): string {
    const uuid = crypto.randomUUID();
    const sanitized = folderPath.startsWith("/")
      ? folderPath.slice(1)
      : folderPath;
    const cleanPath = sanitized || "_root";
    return `${cleanPath}/${fileName}-${uuid}`;
  }

  computeArchiveKey(folderId: string): string {
    const uuid = crypto.randomUUID();
    return `archives/${folderId}/${uuid}.zip`;
  }

  async upload(input: UploadBridgeInput): Promise<FileObject> {
    return this.storage.upload(input);
  }

  async getSignedGetUrl(key: string, expiresIn?: number): Promise<string> {
    return this.storage.getSignedGetUrl(key, { expiresIn });
  }

  async copy(sourceKey: string, destKey: string): Promise<FileObject> {
    return this.storage.copy(sourceKey, destKey);
  }

  async move(sourceKey: string, destKey: string): Promise<FileObject> {
    return this.storage.move(sourceKey, destKey);
  }

  async remove(key: string): Promise<void> {
    return this.storage.remove(key);
  }

  async get(key: string): Promise<Buffer> {
    return this.storage.get(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.storage.exists(key);
  }
}
