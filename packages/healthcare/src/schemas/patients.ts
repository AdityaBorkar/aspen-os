import { BranchIdSchema, IdSchema, NameSchema, PhoneSchema } from "#/schemas/utils";

import type { InferOutput } from "valibot";
import {
  array,
  integer,
  maxLength,
  minLength,
  number,
  object,
  optional,
  picklist,
  pipe,
  string,
} from "valibot";

export const CreatePatientSchema = object({
  abha: optional(string()),
  allergies: optional(array(string()), []),
  branchId: BranchIdSchema,
  dob: optional(string()),
  fullName: NameSchema,
  gender: optional(picklist(["male", "female", "other"])),
  guardian: optional(string()),
  language: optional(string(), "en"),
  phone: PhoneSchema,
});

export const UpdatePatientSchema = object({
  abha: optional(string()),
  branchId: BranchIdSchema,
  dob: optional(string()),
  fullName: optional(NameSchema),
  gender: optional(picklist(["male", "female", "other"])),
  guardian: optional(string()),
  id: IdSchema,
  language: optional(string()),
  phone: optional(pipe(string(), minLength(7), maxLength(20))),
  status: optional(string()),
});

export const PatientFiltersSchema = object({
  branchId: BranchIdSchema,
  limit: optional(pipe(number(), integer())),
  name: optional(string()),
  offset: optional(pipe(number(), integer())),
  phone: optional(string()),
});

export const DedupeCheckSchema = object({
  abha: optional(string()),
  branchId: BranchIdSchema,
  phone: optional(string()),
});

export const PatientIdSchema = object({
  id: IdSchema,
});

export const CreateFamilyLinkSchema = object({
  branchId: BranchIdSchema,
  linkedName: NameSchema,
  linkedPhone: optional(string()),
  patientId: pipe(string(), minLength(1, "Patient ID is required")),
  relation: pipe(string(), minLength(1, "Relation is required")),
});

export const CreateAllergySchema = object({
  branchId: BranchIdSchema,
  name: pipe(string(), minLength(1, "Allergy name is required")),
  note: optional(string()),
  patientId: pipe(string(), minLength(1, "Patient ID is required")),
  reaction: optional(pipe(string(), maxLength(500))),
  severity: picklist(["mild", "moderate", "severe"]),
});

export const CreateFlagSchema = object({
  branchId: BranchIdSchema,
  label: pipe(string(), minLength(1, "Flag label is required")),
  level: picklist(["info", "watch", "critical"]),
  patientId: pipe(string(), minLength(1, "Patient ID is required")),
});

export const LogCommunicationSchema = object({
  branchId: BranchIdSchema,
  channel: picklist(["sms", "call", "whatsapp", "email", "in-person"]),
  message: pipe(string(), minLength(1, "Message is required")),
  patientId: pipe(string(), minLength(1, "Patient ID is required")),
});

export const EnrolRecallSchema = object({
  at: pipe(string(), minLength(1, "Recall date is required")),
  branchId: BranchIdSchema,
  patientId: pipe(string(), minLength(1, "Patient ID is required")),
  reason: pipe(string(), minLength(1, "Recall reason is required")),
});

export const RequestMergeSchema = object({
  branchId: BranchIdSchema,
  duplicateId: pipe(string(), minLength(1, "Duplicate patient ID is required")),
  primaryId: pipe(string(), minLength(1, "Primary patient ID is required")),
  reason: optional(string()),
});

export const ApproveMergeSchema = object({
  id: pipe(string(), minLength(1, "Merge request ID is required")),
});

export type CreatePatientInput = InferOutput<typeof CreatePatientSchema>;
export type UpdatePatientInput = InferOutput<typeof UpdatePatientSchema>;
export type PatientFilters = InferOutput<typeof PatientFiltersSchema>;
export type DedupeCheckInput = InferOutput<typeof DedupeCheckSchema>;
export type PatientId = InferOutput<typeof PatientIdSchema>;
export type CreateFamilyLinkInput = InferOutput<typeof CreateFamilyLinkSchema>;
export type CreateAllergyInput = InferOutput<typeof CreateAllergySchema>;
export type CreateFlagInput = InferOutput<typeof CreateFlagSchema>;
export type LogCommunicationInput = InferOutput<typeof LogCommunicationSchema>;
export type EnrolRecallInput = InferOutput<typeof EnrolRecallSchema>;
export type RequestMergeInput = InferOutput<typeof RequestMergeSchema>;
export type ApproveMergeInput = InferOutput<typeof ApproveMergeSchema>;
