import type { JsonValue } from "#/server/types";

import {
  maxLength,
  minLength,
  object,
  pipe,
  record,
  regex,
  string,
  transform,
  unknown,
} from "valibot";
import type { InferOutput } from "valibot";

/**
 * Shared, framework-level validation primitives. Every domain package should
 * import these from `@aspen-os/platform/server` instead of re-declaring its own
 * copies, so a primitive has exactly one definition.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;
const SCOPE_TYPE_REGEX = /^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*$/;
const SLUG_REGEX = /^[a-z0-9]+(?<suffix>-[a-z0-9]+)*$/;

/** A universally required identity value (a UUID v7, prefixed key, etc.). */
export const IdSchema = pipe(string(), minLength(1, "id is required"));

/** An object that carries an `id` field. */
export const WithIdSchema = object({ id: string() });

/** A general-purpose name (1–255 characters). */
export const NameSchema = pipe(
  string(),
  minLength(1, "Name is required"),
  maxLength(255, "Must be at most 255 characters"),
);

/** A basic email-address format check. */
export const EmailSchema = pipe(string(), regex(EMAIL_REGEX, "Must be a valid email address"));

/** A 6-digit hex color, e.g. `#3B82F6`. */
export const HexColorSchema = pipe(
  string(),
  regex(HEX_COLOR_REGEX, "Must be a valid 6-digit hex color (e.g., #3B82F6)"),
);

/** A URL-safe slug (lowercase alphanumerics joined by hyphens). */
export const SlugSchema = pipe(
  string(),
  minLength(3, "Must be at least 3 characters"),
  maxLength(63, "Must be at most 63 characters"),
  regex(SLUG_REGEX, "Must be URL-safe alphanumeric with hyphens"),
);

/** A scoped identifier following the `<module>:<entity>` convention. */
export const ScopeTypeSchema = pipe(
  string(),
  regex(SCOPE_TYPE_REGEX, "Must be <module>:<entity> (e.g. masters:contact)"),
);

/**
 * Accepts any input and asserts the JSON-serializable contract at the type
 * level. Runtime behavior is identity: values arrive as JSON (RPC payloads,
 * jsonb reads) and are (de)serialized at the storage boundary.
 */
export const JsonValueSchema = pipe(
  unknown(),
  // SAFETY: inputs to this schema arrive as JSON payloads or jsonb reads, so
  // they are JSON-serializable by construction; JsonValue is their contract.
  transform((value) => value as JsonValue),
);

/** A string-keyed map of JSON-serializable values (e.g. entity metadata). */
export const MetadataSchema = record(string(), JsonValueSchema);

export type Metadata = InferOutput<typeof MetadataSchema>;
