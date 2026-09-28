import { ChargeTypeSchema } from "#/schemas/enums";

import {
  array,
  boolean,
  minLength,
  nullable,
  number,
  object,
  optional,
  pipe,
  string,
} from "valibot";
import type { InferOutput } from "valibot";

export const TaxRuleInputSchema = object({
  accountHead: pipe(string(), minLength(1, "accountHead is required")),
  chargeType: optional(ChargeTypeSchema, "on_net_total"),
  description: optional(nullable(string())),
  rate: number(),
  rowIndex: optional(number(), 0),
});

export type TaxRuleInput = InferOutput<typeof TaxRuleInputSchema>;

export const CreateTaxTemplateSchema = object({
  isSales: optional(boolean(), true),
  name: pipe(string(), minLength(1, "Name is required")),
  rules: pipe(array(TaxRuleInputSchema), minLength(1, "At least one rule is required")),
  taxCategory: optional(nullable(string())),
});

export type CreateTaxTemplateInput = InferOutput<typeof CreateTaxTemplateSchema>;

export const UpdateTaxTemplateSchema = object({
  isSales: optional(boolean()),
  name: optional(pipe(string(), minLength(1, "Name is required"))),
  rules: optional(array(TaxRuleInputSchema)),
  taxCategory: optional(nullable(string())),
});

export type UpdateTaxTemplateInput = InferOutput<typeof UpdateTaxTemplateSchema>;

export const TaxTemplateFiltersSchema = object({
  isSales: optional(boolean()),
});

export type TaxTemplateFilters = InferOutput<typeof TaxTemplateFiltersSchema>;

export const PaymentTermLineSchema = object({
  daysAfter: number(),
  percent: number(),
});

export type PaymentTermLine = InferOutput<typeof PaymentTermLineSchema>;

export const CreatePaymentTermTemplateSchema = object({
  name: pipe(string(), minLength(1, "Name is required")),
  schedule: pipe(array(PaymentTermLineSchema), minLength(1, "Schedule is required")),
});

export type CreatePaymentTermTemplateInput = InferOutput<typeof CreatePaymentTermTemplateSchema>;

export const PaymentTermFiltersSchema = object({
  search: optional(string()),
});

export type PaymentTermFilters = InferOutput<typeof PaymentTermFiltersSchema>;
