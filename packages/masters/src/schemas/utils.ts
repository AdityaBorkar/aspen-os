import { isValidCountryCode } from "@aspen-os/constants";
import { JsonValueSchema, NameSchema as PlatformNameSchema } from "@aspen-os/platform/server";
import { check, maxLength, minLength, pipe, record, regex, string, transform } from "valibot";

export { EmailSchema, HexColorSchema, IdSchema, WithIdSchema } from "@aspen-os/platform/server";

export const NameSchema = PlatformNameSchema;

const ORG_BRANCH_CODE_REGEX = /^[A-Za-z0-9]+(?<suffix>-[A-Za-z0-9]+)*$/;

export const OrgBranchCodeSchema = pipe(
  string(),
  minLength(2, "Must be at least 2 characters"),
  maxLength(20, "Must be at most 20 characters"),
  regex(ORG_BRANCH_CODE_REGEX, "Must be alphanumeric with hyphens"),
);

export const MetadataSchema = record(string(), JsonValueSchema);

const ISO_COUNTRY_CODE_REGEX = /^[A-Za-z]{2}$/;

export const CountryCodeSchema = pipe(
  string(),
  regex(ISO_COUNTRY_CODE_REGEX, "Must be a valid ISO 3166-1 alpha-2 code"),
  transform((value) => value.toUpperCase()),
  check((value) => isValidCountryCode(value), "Must be a valid ISO 3166-1 alpha-2 code"),
);

// 2-digit state code + 10-char PAN + entity number + "Z" + checksum.
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export const GstinSchema = pipe(
  string(),
  transform((value) => value.toUpperCase()),
  regex(GSTIN_REGEX, "Must be a valid 15-character GSTIN"),
);
