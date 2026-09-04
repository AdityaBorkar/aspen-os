import { isValidCountryCode } from "@aspen-os/constants";
import { check, maxLength, minLength, number, object, pipe, regex, string } from "valibot";

export { NameSchema, SlugSchema } from "@aspen-os/platform/server";

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;
const BRANCH_CODE_REGEX = /^[A-Za-z0-9]+(?<suffix>-[A-Za-z0-9]+)*$/;
const ISO_COUNTRY_CODE_REGEX = /^[A-Za-z]{2}$/;

export const AccentColorSchema = pipe(
  string(),
  regex(HEX_COLOR_REGEX, "Must be a valid 6-digit hex color (e.g., #3B82F6)"),
);

export const BranchCodeSchema = pipe(
  string(),
  minLength(2, "Must be at least 2 characters"),
  maxLength(20, "Must be at most 20 characters"),
  regex(BRANCH_CODE_REGEX, "Must be alphanumeric with hyphens"),
);

export const CountryCodeSchema = pipe(
  string(),
  regex(ISO_COUNTRY_CODE_REGEX, "Must be a valid ISO 3166-1 alpha-2 code"),
  check((value) => isValidCountryCode(value), "Must be a valid ISO 3166-1 alpha-2 code"),
);

export const LogoFileSchema = pipe(
  object({
    contentType: string(),
    size: number(),
  }),
  check(({ contentType, size }) => {
    const allowed = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
    return allowed.includes(contentType) && size <= 5 * 1024 * 1024;
  }, "Must be PNG, JPG, SVG, or WebP and max 5MB"),
);
