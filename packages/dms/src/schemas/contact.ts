import { EmailSchema } from "#/schemas/utils";

import { check, maxLength, nullish, object, optional, pipe, string } from "valibot";
import type { InferOutput } from "valibot";

export const ContactNameSchema = pipe(
  string(),
  maxLength(255),
  check((val) => val.length > 0, "Field is required"),
);

export const PhoneSchema = pipe(
  string(),
  maxLength(50),
  check((val) => val.length > 0, "Phone is required"),
);

export const CompanyNameSchema = pipe(
  string(),
  maxLength(255),
  check((val) => val.length > 0, "Company name is required"),
);

export const DesignationSchema = pipe(
  string(),
  maxLength(255),
  check((val) => val.length > 0, "Designation is required"),
);

export const CreateContactSchema = object({
  companyName: CompanyNameSchema,
  createdBy: string(),
  deletionReason: optional(string()),
  designation: DesignationSchema,
  email: EmailSchema,
  firstName: ContactNameSchema,
  lastName: ContactNameSchema,
  linkedUserId: optional(nullish(string())),
  phone: PhoneSchema,
});

export type CreateContactInput = InferOutput<typeof CreateContactSchema>;

export const UpdateContactSchema = object({
  companyName: optional(CompanyNameSchema),
  designation: optional(DesignationSchema),
  email: optional(EmailSchema),
  firstName: optional(ContactNameSchema),
  lastName: optional(ContactNameSchema),
  linkedUserId: optional(nullish(string())),
  phone: optional(PhoneSchema),
});

export type UpdateContactInput = InferOutput<typeof UpdateContactSchema>;

export const RemoveContactSchema = object({
  reason: pipe(
    string(),
    check((val) => val.length > 0, "Deletion reason is required"),
  ),
});

export type RemoveContactInput = InferOutput<typeof RemoveContactSchema>;

export const ContactFiltersSchema = object({
  isRemoved: optional(string()),
  search: optional(string()),
});

export type ContactFilters = InferOutput<typeof ContactFiltersSchema>;
