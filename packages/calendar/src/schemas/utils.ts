import { minLength, object, pipe, regex, string } from "valibot";

const SCOPE_TYPE_REGEX = /^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

export const IdSchema = pipe(string(), minLength(1, "id is required"));

export const WithIdSchema = object({ id: string() });

export const NameSchema = pipe(string(), minLength(1, "Name is required"));

export const ScopeTypeSchema = pipe(
  string(),
  regex(SCOPE_TYPE_REGEX, "Must be <module>:<entity> (e.g. masters:contact)"),
);

export const EmailSchema = pipe(string(), regex(EMAIL_REGEX, "Must be a valid email address"));

export const HexColorSchema = pipe(
  string(),
  regex(HEX_COLOR_REGEX, "Must be a valid 6-digit hex color (e.g., #3B82F6)"),
);

export const TimezoneSchema = pipe(string(), minLength(1, "timezone is required"));
