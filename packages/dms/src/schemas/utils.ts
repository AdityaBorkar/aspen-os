import { check, maxLength, minLength, pipe, regex, string } from "valibot";

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

export const EmailSchema = pipe(
  string(),
  regex(EMAIL_REGEX, "Must be a valid email address"),
);
