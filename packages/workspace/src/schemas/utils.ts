import {
  integer,
  maxLength,
  minLength,
  minValue,
  number,
  object,
  optional,
  pipe,
  regex,
  string,
} from "valibot";

const DOMAIN_REGEX = /^[a-z][a-z0-9_-]*:[a-z][a-z0-9_-]*$/;
const IANA_TZ_REGEX = /^[A-Za-z_]+(?:\/[A-Za-z_+-]+)*$/;

export const IdSchema = pipe(string(), minLength(1, "id is required"));

export const NameSchema = pipe(
  string(),
  minLength(1, "Name is required"),
  maxLength(255, "Must be at most 255 characters"),
);

export const TitleSchema = pipe(
  string(),
  minLength(1, "Title is required"),
  maxLength(255, "Must be at most 255 characters"),
);

export const DomainSchema = pipe(
  string(),
  minLength(1, "Domain is required"),
  maxLength(255, "Must be at most 255 characters"),
  regex(DOMAIN_REGEX, "Domain must follow the <module>:<entity> convention (e.g. workspace:draft)"),
);

export const TimezoneSchema = pipe(
  string(),
  minLength(1, "Timezone is required"),
  regex(IANA_TZ_REGEX, "Must be a valid IANA timezone (e.g. UTC, Asia/Kolkata)"),
);

export const LimitSchema = optional(pipe(number(), integer(), minValue(0)), 50);

export const OffsetSchema = optional(pipe(number(), integer(), minValue(0)), 0);

export const WithIdSchema = object({ id: string() });
