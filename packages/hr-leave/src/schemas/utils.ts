import { maxLength, minLength, nullable, optional, pipe, string } from "valibot";

export { NameSchema } from "@aspen-os/platform/server";

export const EmployeeIdSchema = pipe(
  string(),
  minLength(1, "Employee ID is required"),
  maxLength(50, "Must be at most 50 characters"),
);

export const EmailSchema = pipe(string(), maxLength(255, "Must be at most 255 characters"));

export const PhoneSchema = pipe(string(), maxLength(20, "Must be at most 20 characters"));

export const OptionalStringSchema = optional(nullable(string()));

export const DateStringSchema = pipe(string(), minLength(1, "Date is required"));

export const OptionalDateStringSchema = optional(string());
