import {
  boolean,
  type InferOutput,
  maxLength,
  minLength,
  nullable,
  object,
  optional,
  pipe,
  string,
} from "valibot";

export const CreateBankAccountSchema = object({
  accountHolderName: pipe(
    string(),
    minLength(1, "Account holder name is required"),
  ),
  accountNumber: pipe(string(), minLength(1, "Account number is required")),
  accountType: optional(
    nullable(
      pipe(
        string(),
        maxLength(50, "Account type must be at most 50 characters"),
      ),
    ),
  ),
  bankName: pipe(string(), minLength(1, "Bank name is required")),
  branchName: optional(nullable(string())),
  currency: optional(string(), "USD"),
  isActive: optional(boolean(), true),
  isPrimary: optional(boolean(), false),
  metadata: optional(nullable(object({}))),
  routingNumber: optional(nullable(string())),
  swiftCode: optional(
    nullable(
      pipe(string(), maxLength(11, "SWIFT code must be at most 11 characters")),
    ),
  ),
});

export type CreateBankAccountInput = InferOutput<
  typeof CreateBankAccountSchema
>;

export const UpdateBankAccountSchema = object({
  accountHolderName: optional(string()),
  accountNumber: optional(string()),
  accountType: optional(
    nullable(
      pipe(
        string(),
        maxLength(50, "Account type must be at most 50 characters"),
      ),
    ),
  ),
  bankName: optional(string()),
  branchName: optional(nullable(string())),
  currency: optional(string()),
  isActive: optional(boolean()),
  isPrimary: optional(boolean()),
  metadata: optional(nullable(object({}))),
  routingNumber: optional(nullable(string())),
  swiftCode: optional(
    nullable(
      pipe(string(), maxLength(11, "SWIFT code must be at most 11 characters")),
    ),
  ),
});

export type UpdateBankAccountInput = InferOutput<
  typeof UpdateBankAccountSchema
>;

export const BankAccountFiltersSchema = object({
  currency: optional(string()),
  isActive: optional(boolean()),
  isPrimary: optional(boolean()),
});

export type BankAccountFilters = InferOutput<typeof BankAccountFiltersSchema>;
