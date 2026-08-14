import { check, maxLength, minLength, object, pipe, regex, string } from "valibot";

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;
const NAME_NO_SLASH_REGEX = /^[^/]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const IdSchema = pipe(string(), minLength(1, "id is required"));

export const NameSchema = pipe(
  string(),
  minLength(1, "Name is required"),
  maxLength(255, "Must be at most 255 characters"),
);

export const FileNameSchema = pipe(
  string(),
  minLength(1, "File name is required"),
  maxLength(255, "Must be at most 255 characters"),
  regex(NAME_NO_SLASH_REGEX, "Must not contain slashes"),
  check((val) => !val.includes("\0"), "Must not contain null bytes"),
);

export const LabelNameSchema = pipe(
  string(),
  minLength(1, "Label name is required"),
  maxLength(100, "Must be at most 100 characters"),
);

export const HexColorSchema = pipe(
  string(),
  regex(HEX_COLOR_REGEX, "Must be a valid 6-digit hex color (e.g., #3B82F6)"),
);

export const EmailSchema = pipe(string(), regex(EMAIL_REGEX, "Must be a valid email address"));

export const FileIdSchema = string();

export const WithFileIdSchema = object({ id: FileIdSchema });

export const WithIdSchema = object({ id: string() });
