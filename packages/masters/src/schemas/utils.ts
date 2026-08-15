import { maxLength, minLength, object, pipe, regex, string } from "valibot";

const ISO_COUNTRY_CODE_REGEX = /^[A-Z]{2}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const IdSchema = pipe(string(), minLength(1, "id is required"));

export const NameSchema = pipe(
  string(),
  minLength(1, "Name is required"),
  maxLength(255, "Must be at most 255 characters"),
);

export const CountryCodeSchema = pipe(
  string(),
  regex(ISO_COUNTRY_CODE_REGEX, "Must be a valid ISO 3166-1 alpha-2 code"),
);

export const EmailSchema = pipe(string(), regex(EMAIL_REGEX, "Must be a valid email address"));

export const WithIdSchema = object({ id: string() });
