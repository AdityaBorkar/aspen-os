import {
  check,
  maxLength,
  minLength,
  number,
  object,
  pipe,
  regex,
  string,
} from "valibot";

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;
const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const BRANCH_CODE_REGEX = /^[A-Z0-9]+(-[A-Z0-9]+)*$/;
const ISO_COUNTRY_CODE_REGEX = /^[A-Z]{2}$/;

export const AccentColorSchema = pipe(
  string(),
  regex(HEX_COLOR_REGEX, "Must be a valid 6-digit hex color (e.g., #3B82F6)"),
);

export const SlugSchema = pipe(
  string(),
  minLength(3, "Must be at least 3 characters"),
  maxLength(63, "Must be at most 63 characters"),
  regex(SLUG_REGEX, "Must be URL-safe alphanumeric with hyphens"),
);

export const NameSchema = pipe(
  string(),
  minLength(1, "Name is required"),
  maxLength(255, "Must be at most 255 characters"),
);

export const BranchCodeSchema = pipe(
  string(),
  minLength(2, "Must be at least 2 characters"),
  maxLength(20, "Must be at most 20 characters"),
  regex(BRANCH_CODE_REGEX, "Must be uppercase alphanumeric with hyphens"),
);

export const CountryCodeSchema = pipe(
  string(),
  regex(ISO_COUNTRY_CODE_REGEX, "Must be a valid ISO 3166-1 alpha-2 code"),
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
