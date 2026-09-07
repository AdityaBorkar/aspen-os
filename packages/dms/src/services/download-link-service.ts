import { getSignedGetUrl } from "#/services/storage-bridge";

export interface DownloadExpiryInput {
  defaultExpiry: number;
  maxExpiry: number;
  requested?: number | null;
}

/**
 * Clamps a requested presigned-URL TTL to the configured ceiling.
 */
export function resolveDownloadExpiry(input: DownloadExpiryInput): number {
  return Math.min(input.requested ?? input.defaultExpiry, input.maxExpiry);
}

export async function getDownloadLink(input: { expiresIn: number; key: string }): Promise<string> {
  return getSignedGetUrl({ expiresIn: input.expiresIn, key: input.key });
}
