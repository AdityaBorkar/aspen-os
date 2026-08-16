import type { JsonValue } from "@aspen-os/platform/server";
import { pipe, transform, unknown } from "valibot";

/**
 * Accepts any input and asserts the JSON-serializable contract at the type
 * level. Runtime behavior is identity: values arrive as JSON (RPC payloads,
 * jsonb reads) and are (de)serialized at the storage boundary.
 */
export const JsonValueSchema = pipe(
  unknown(),
  // SAFETY: inputs to this schema arrive as JSON payloads or jsonb reads, so
  // They are JSON-serializable by construction; JsonValue is their contract.
  transform((value) => value as JsonValue),
);
