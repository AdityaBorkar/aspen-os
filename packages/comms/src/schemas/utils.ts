import { pipe, regex, string } from "valibot";

export { EmailSchema, IdSchema, NameSchema, WithIdSchema } from "@aspen-os/platform/server";

const PHONE_REGEX = /^\+?[0-9][0-9\s().-]{7,}$/;

export const PhoneSchema = pipe(string(), regex(PHONE_REGEX, "Must be a valid phone number"));
