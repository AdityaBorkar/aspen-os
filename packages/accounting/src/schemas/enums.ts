import {
  ACCOUNT_TYPE,
  ASSET_STATUS,
  BANK_MATCH_STATUS,
  CHARGE_TYPE,
  DEPRECIATION_FREQUENCY,
  DEPRECIATION_METHOD,
  DOC_STATUS,
  FISCAL_YEAR_STATUS,
  INVOICE_STATUS,
  JOURNAL_TYPE,
  MATERIAL_REQUEST_TYPE,
  ORDER_STATUS,
  PARTY_TYPE,
  PAYMENT_TYPE,
  QUOTATION_STATUS,
  ROOT_TYPE,
  SCHEDULE_STATUS,
} from "#/utils/constants";

import { enum as enum_ } from "valibot";

export const RootTypeSchema = enum_(ROOT_TYPE);
export const AccountTypeSchema = enum_(ACCOUNT_TYPE);
export const DocStatusSchema = enum_(DOC_STATUS);
export const OrderStatusSchema = enum_(ORDER_STATUS);
export const InvoiceStatusSchema = enum_(INVOICE_STATUS);
export const PaymentTypeSchema = enum_(PAYMENT_TYPE);
export const DepreciationMethodSchema = enum_(DEPRECIATION_METHOD);
export const AssetStatusSchema = enum_(ASSET_STATUS);
export const ChargeTypeSchema = enum_(CHARGE_TYPE);
export const JournalTypeSchema = enum_(JOURNAL_TYPE);
export const QuotationStatusSchema = enum_(QUOTATION_STATUS);
export const FiscalYearStatusSchema = enum_(FISCAL_YEAR_STATUS);
export const DepreciationFrequencySchema = enum_(DEPRECIATION_FREQUENCY);
export const ScheduleStatusSchema = enum_(SCHEDULE_STATUS);
export const PartyTypeSchema = enum_(PARTY_TYPE);
export const MaterialRequestTypeSchema = enum_(MATERIAL_REQUEST_TYPE);
export const BankMatchStatusSchema = enum_(BANK_MATCH_STATUS);
