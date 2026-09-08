import { isValidCountryCode } from "@aspen-os/constants";
import { JsonValueSchema, NameSchema as PlatformNameSchema } from "@aspen-os/platform/server";
import { check, maxLength, minLength, pipe, record, regex, string, transform } from "valibot";

export { EmailSchema, IdSchema, WithIdSchema } from "@aspen-os/platform/server";

export const NameSchema = PlatformNameSchema;

const ORG_BRANCH_CODE_REGEX = /^[A-Za-z0-9]+(?<suffix>-[A-Za-z0-9]+)*$/;

export const OrgBranchCodeSchema = pipe(
  string(),
  minLength(2, "Must be at least 2 characters"),
  maxLength(20, "Must be at most 20 characters"),
  regex(ORG_BRANCH_CODE_REGEX, "Must be alphanumeric with hyphens"),
);

// Deprecated aliases — prefer OrgBranchCodeSchema.
export const BranchCodeSchema = OrgBranchCodeSchema;
export const BRANCH_CODE_REGEX = ORG_BRANCH_CODE_REGEX;

export const MetadataSchema = record(string(), JsonValueSchema);

const ISO_COUNTRY_CODE_REGEX = /^[A-Za-z]{2}$/;

export const CountryCodeSchema = pipe(
  string(),
  regex(ISO_COUNTRY_CODE_REGEX, "Must be a valid ISO 3166-1 alpha-2 code"),
  transform((value) => value.toUpperCase()),
  check((value) => isValidCountryCode(value), "Must be a valid ISO 3166-1 alpha-2 code"),
);
