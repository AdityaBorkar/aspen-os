import { isValidCountryCode } from "@aspen-os/constants";
import { JsonValueSchema } from "@aspen-os/platform/server";
import { check, pipe, record, regex, string, transform } from "valibot";

export { EmailSchema, IdSchema, NameSchema, WithIdSchema } from "@aspen-os/platform/server";

export const MetadataSchema = record(string(), JsonValueSchema);

const ISO_COUNTRY_CODE_REGEX = /^[A-Za-z]{2}$/;

export const CountryCodeSchema = pipe(
  string(),
  regex(ISO_COUNTRY_CODE_REGEX, "Must be a valid ISO 3166-1 alpha-2 code"),
  transform((value) => value.toUpperCase()),
  check((value) => isValidCountryCode(value), "Must be a valid ISO 3166-1 alpha-2 code"),
);
