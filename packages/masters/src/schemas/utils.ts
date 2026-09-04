import { JsonValueSchema } from "@aspen-os/platform/server";
import { pipe, record, regex, string } from "valibot";

export { EmailSchema, IdSchema, NameSchema, WithIdSchema } from "@aspen-os/platform/server";

export const MetadataSchema = record(string(), JsonValueSchema);

const ISO_COUNTRY_CODE_REGEX = /^[A-Z]{2}$/;

export const CountryCodeSchema = pipe(
  string(),
  regex(ISO_COUNTRY_CODE_REGEX, "Must be a valid ISO 3166-1 alpha-2 code"),
);
