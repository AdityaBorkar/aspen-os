import { check, maxLength, minLength, pipe, regex, string } from "valibot";

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;
const NAME_NO_SLASH_REGEX = /^[^/]+$/;

export const HexColorSchema = pipe(
  string(),
  regex(HEX_COLOR_REGEX, "Must be a valid 6-digit hex color (e.g., #3B82F6)"),
);

export const ItemNameSchema = pipe(
  string(),
  minLength(1, "Name is required"),
  maxLength(255, "Must be at most 255 characters"),
  regex(NAME_NO_SLASH_REGEX, "Must not contain slashes"),
  check((val) => !val.includes("\0"), "Must not contain null bytes"),
);

export const LabelNameSchema = pipe(
  string(),
  minLength(1, "Label name is required"),
  maxLength(100, "Must be at most 100 characters"),
);
