import { maxLength, minLength, object, pipe, regex, string } from "valibot";

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

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

export const EmailSchema = pipe(
  string(),
  regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Must be a valid email address"),
);

export const WebsiteSchema = pipe(
  string(),
  regex(
    /^https?:\/\/.+/,
    "Must be a valid URL starting with http:// or https://",
  ),
);

export const LogoSchema = pipe(
  object({
    contentType: string(),
    size: string(),
  }),
);
