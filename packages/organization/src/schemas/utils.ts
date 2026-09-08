import { isValidCountryCode } from "@aspen-os/constants";
import { check, maxLength, minLength, pipe, regex, string, transform } from "valibot";

export { NameSchema } from "@aspen-os/platform/server";

const BRANCH_CODE_REGEX = /^[A-Za-z0-9]+(?<suffix>-[A-Za-z0-9]+)*$/;
const ISO_COUNTRY_CODE_REGEX = /^[A-Za-z]{2}$/;

export const BranchCodeSchema = pipe(
  string(),
  minLength(2, "Must be at least 2 characters"),
  maxLength(20, "Must be at most 20 characters"),
  regex(BRANCH_CODE_REGEX, "Must be alphanumeric with hyphens"),
);

export const CountryCodeSchema = pipe(
  string(),
  regex(ISO_COUNTRY_CODE_REGEX, "Must be a valid ISO 3166-1 alpha-2 code"),
  transform((value) => value.toUpperCase()),
  check((value) => isValidCountryCode(value), "Must be a valid ISO 3166-1 alpha-2 code"),
);
