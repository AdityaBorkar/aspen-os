import { maxLength, minLength, object, pipe, regex, string } from "valibot";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9][0-9\s().-]{7,}$/;

export const IdSchema = pipe(string(), minLength(1, "id is required"));

export const NameSchema = pipe(
  string(),
  minLength(1, "Name is required"),
  maxLength(255, "Must be at most 255 characters"),
);

export const EmailSchema = pipe(string(), regex(EMAIL_REGEX, "Must be a valid email address"));

export const PhoneSchema = pipe(string(), regex(PHONE_REGEX, "Must be a valid phone number"));

export const WithIdSchema = object({ id: string() });
