import { maxLength, minLength, pipe, regex, string } from "valibot";

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;
const PROJECT_KEY_REGEX = /^[A-Z]{2,10}$/;

export const HexColorSchema = pipe(
  string(),
  regex(HEX_COLOR_REGEX, "Must be a valid 6-digit hex color (e.g., #3B82F6)"),
);

export const TitleSchema = pipe(
  string(),
  minLength(1, "Title is required"),
  maxLength(500, "Must be at most 500 characters"),
);

export const NameSchema = pipe(
  string(),
  minLength(1, "Name is required"),
  maxLength(255, "Must be at most 255 characters"),
);

export const ProjectKeySchema = pipe(
  string(),
  minLength(2, "Must be at least 2 characters"),
  maxLength(10, "Must be at most 10 characters"),
  regex(PROJECT_KEY_REGEX, "Must be uppercase letters only (2-10 chars)"),
);
