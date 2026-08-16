import { minLength, object, pipe, regex, string } from "valibot";

const SCOPE_TYPE_REGEX = /^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*$/;

export const IdSchema = pipe(string(), minLength(1, "id is required"));

export const WithIdSchema = object({ id: string() });

export const ScopeTypeSchema = pipe(
  string(),
  regex(SCOPE_TYPE_REGEX, "Must be <module>:<entity> (e.g. masters:contact)"),
);
