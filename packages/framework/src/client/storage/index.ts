import type { StorageConfig } from "./types";

export type { StorageConfig };

export class StorageUnit {
  readonly name = "storage";

  constructor(_config: StorageConfig, _deps?: { db?: unknown }) {
    throw new Error(
      "StorageUnit is not supported on the client side. Use server-side framework instead.",
    );
  }

  async prepare(): Promise<void> {
    throw new Error("StorageUnit is not supported on the client side.");
  }

  async destroy(): Promise<void> {
    throw new Error("StorageUnit is not supported on the client side.");
  }

  async healthCheck(): Promise<boolean> {
    return false;
  }

  async archive(_key: string, _archiveKey?: string): Promise<never> {
    throw new Error("StorageUnit is not supported on the client side.");
  }

  async copy(_sourceKey: string, _destinationKey: string): Promise<never> {
    throw new Error("StorageUnit is not supported on the client side.");
  }

  async exists(_key: string): Promise<boolean> {
    throw new Error("StorageUnit is not supported on the client side.");
  }

  async get(_key: string): Promise<Buffer> {
    throw new Error("StorageUnit is not supported on the client side.");
  }

  async getMetadata(_key: string): Promise<never> {
    throw new Error("StorageUnit is not supported on the client side.");
  }

  async getSignedGetUrl(_key: string, _options?: unknown): Promise<string> {
    throw new Error("StorageUnit is not supported on the client side.");
  }

  async getSignedPutUrl(_key: string, _options?: unknown): Promise<string> {
    throw new Error("StorageUnit is not supported on the client side.");
  }

  async list(
    _prefix?: string,
    _options?: unknown,
  ): Promise<{ files: never[]; nextContinuationToken?: string }> {
    throw new Error("StorageUnit is not supported on the client side.");
  }

  async move(_sourceKey: string, _destinationKey: string): Promise<never> {
    throw new Error("StorageUnit is not supported on the client side.");
  }

  async remove(_key: string): Promise<void> {
    throw new Error("StorageUnit is not supported on the client side.");
  }

  async upload(_input: unknown): Promise<never> {
    throw new Error("StorageUnit is not supported on the client side.");
  }
}
