import { IdSchema } from "#/schemas/utils";

import {
  integer,
  maxLength,
  minLength,
  nullable,
  number,
  object,
  optional,
  picklist,
  pipe,
  regex,
  string,
  unknown,
} from "valibot";
import type { InferOutput } from "valibot";

export const LOGO_OWNER_TYPE = {
  ORGANIZATION: "organization",
  SERVICE_PROVIDER: "service-provider",
  TENANT: "tenant",
} as const;

export type LogoOwnerType = (typeof LOGO_OWNER_TYPE)[keyof typeof LOGO_OWNER_TYPE];

export const LogoOwnerTypeSchema = picklist(Object.values(LOGO_OWNER_TYPE));

export const LOGO_ALLOWED_CONTENT_TYPES = [
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  "image/webp",
] as const;

export type LogoContentType = (typeof LOGO_ALLOWED_CONTENT_TYPES)[number];

export const LogoContentTypeSchema = picklist([...LOGO_ALLOWED_CONTENT_TYPES]);

export const MAX_LOGO_SIZE = 2 * 1024 * 1024;

export const LOGO_KEY_PREFIX = "logos/";

/**
 * Storage reference for a logo.
 *
 * Logos are binary objects owned by the platform Storage unit. The database
 * never stores bytes, data URLs, or external URLs — it stores the Storage
 * logical key (for example `logos/tenant/<id>/logo.png`). Use the logo
 * upload workflows to write bytes through Storage, then persist the returned
 * key. Resolve a display URL with the logo download-url workflows.
 */
export const LogoStorageKeySchema = pipe(
  string(),
  minLength(1, "Logo storage key is required"),
  maxLength(1024, "Logo storage key must be at most 1024 characters"),
  regex(
    /^logos\//,
    "Logo must be a Storage key starting with logos/ — upload via the logo upload workflow",
  ),
);

export type LogoStorageKey = InferOutput<typeof LogoStorageKeySchema>;

export const LogoFileNameSchema = pipe(
  string(),
  minLength(1, "File name is required"),
  maxLength(255, "File name must be at most 255 characters"),
  regex(/^[^/\\]+$/, "File name must not contain path separators"),
);

export const UploadLogoSchema = object({
  body: unknown(),
  contentType: LogoContentTypeSchema,
  fileName: LogoFileNameSchema,
  id: IdSchema,
});

export type UploadLogoInput = InferOutput<typeof UploadLogoSchema>;

export const RemoveLogoSchema = object({
  id: IdSchema,
});

export type RemoveLogoInput = InferOutput<typeof RemoveLogoSchema>;

export const LogoUrlSchema = object({
  expiresIn: optional(pipe(number(), integer())),
  id: IdSchema,
});

export type LogoUrlInput = InferOutput<typeof LogoUrlSchema>;

export const IssueLogoUploadUrlSchema = object({
  contentType: LogoContentTypeSchema,
  expiresIn: optional(pipe(number(), integer())),
  fileName: LogoFileNameSchema,
  id: IdSchema,
});

export type IssueLogoUploadUrlInput = InferOutput<typeof IssueLogoUploadUrlSchema>;

export const AttachLogoSchema = object({
  id: IdSchema,
  storageKey: LogoStorageKeySchema,
});

export type AttachLogoInput = InferOutput<typeof AttachLogoSchema>;

export const NullableLogoStorageKeySchema = nullable(LogoStorageKeySchema);

export const OptionalNullableLogoSchema = optional(NullableLogoStorageKeySchema);
