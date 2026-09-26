import { getManagementStorage } from "#/runtime";
import { LOGO_KEY_PREFIX, MAX_LOGO_SIZE } from "#/schemas/logo";
import type { LogoContentType, LogoOwnerType } from "#/schemas/logo";

import type { FileObject } from "@aspen-os/platform/server";

export type LogoUploadBody = Buffer | ReadableStream | string;

interface ComputeLogoKeyInput {
  fileName: string;
  ownerId: string;
  ownerType: LogoOwnerType;
}

export function sanitizeLogoFileName(fileName: string): string {
  const withoutPaths = fileName
    .replaceAll(/[\\/]+/g, "_")
    .replaceAll("\0", "")
    .trim();
  const collapsed = withoutPaths.replaceAll(/\s+/g, "-");
  return collapsed.slice(0, 255) || "logo";
}

export function computeLogoKey(input: ComputeLogoKeyInput): string {
  const safeName = sanitizeLogoFileName(input.fileName);
  return `${LOGO_KEY_PREFIX}${input.ownerType}/${input.ownerId}/${safeName}`;
}

export function assertLogoContentType(contentType: string): asserts contentType is LogoContentType {
  const allowed = [
    "image/avif",
    "image/gif",
    "image/jpeg",
    "image/png",
    "image/svg+xml",
    "image/webp",
  ];
  if (!allowed.includes(contentType)) {
    throw new Error(`Content type "${contentType}" is not allowed for logos.`);
  }
}

export function assertLogoBodySize(body: LogoUploadBody): void {
  if (body instanceof ReadableStream) {
    return;
  }
  const size = body instanceof Buffer ? body.byteLength : Buffer.byteLength(body);
  if (size > MAX_LOGO_SIZE) {
    throw new Error(`Logo exceeds maximum size of ${MAX_LOGO_SIZE} bytes.`);
  }
  if (size === 0) {
    throw new Error("Logo body must not be empty.");
  }
}

interface UploadLogoObjectInput {
  body: LogoUploadBody;
  contentType: string;
  key: string;
  ownerId: string;
}

export async function uploadLogoObject(input: UploadLogoObjectInput): Promise<FileObject> {
  assertLogoContentType(input.contentType);
  assertLogoBodySize(input.body);
  return getManagementStorage().upload({
    body: input.body,
    contentType: input.contentType,
    key: input.key,
    metadata: { ownerId: input.ownerId },
  });
}

export async function getLogoSignedUrl(key: string, expiresIn?: number): Promise<string> {
  return getManagementStorage().getSignedGetUrl(key, { expiresIn: expiresIn ?? 3600 });
}

export async function getLogoUploadUrl(
  key: string,
  contentType: string,
  expiresIn?: number,
): Promise<string> {
  assertLogoContentType(contentType);
  return getManagementStorage().getSignedPutUrl(key, {
    contentType,
    expiresIn: expiresIn ?? 1800,
  });
}

export async function removeLogoObject(key: string): Promise<void> {
  await getManagementStorage().remove(key);
}

export async function logoObjectExists(key: string): Promise<boolean> {
  return getManagementStorage().exists(key);
}
