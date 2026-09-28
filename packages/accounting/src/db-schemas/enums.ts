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

import { pgEnum } from "drizzle-orm/pg-core";

export const accountingRootTypeEnum = pgEnum("accounting_root_type", [
  ROOT_TYPE.ASSET,
  ROOT_TYPE.EQUITY,
  ROOT_TYPE.EXPENSE,
  ROOT_TYPE.INCOME,
  ROOT_TYPE.LIABILITY,
]);

export const accountingAccountTypeEnum = pgEnum("accounting_account_type", [
  ACCOUNT_TYPE.BANK,
  ACCOUNT_TYPE.CASH,
  ACCOUNT_TYPE.EQUITY,
  ACCOUNT_TYPE.EXPENSE,
  ACCOUNT_TYPE.FIXED_ASSET,
  ACCOUNT_TYPE.INCOME,
  ACCOUNT_TYPE.OTHER,
  ACCOUNT_TYPE.PAYABLE,
  ACCOUNT_TYPE.RECEIVABLE,
  ACCOUNT_TYPE.STOCK,
  ACCOUNT_TYPE.TAX,
]);

export const accountingDocStatusEnum = pgEnum("accounting_doc_status", [
  DOC_STATUS.CANCELLED,
  DOC_STATUS.DRAFT,
  DOC_STATUS.REVERSED,
  DOC_STATUS.SUBMITTED,
]);

export const accountingOrderStatusEnum = pgEnum("accounting_order_status", [
  ORDER_STATUS.CANCELLED,
  ORDER_STATUS.CLOSED,
  ORDER_STATUS.COMPLETED,
  ORDER_STATUS.DRAFT,
  ORDER_STATUS.ON_HOLD,
  ORDER_STATUS.TO_BILL,
  ORDER_STATUS.TO_DELIVER,
  ORDER_STATUS.TO_DELIVER_AND_BILL,
  ORDER_STATUS.TO_RECEIVE,
  ORDER_STATUS.TO_RECEIVE_AND_BILL,
]);

export const accountingInvoiceStatusEnum = pgEnum("accounting_invoice_status", [
  INVOICE_STATUS.CANCELLED,
  INVOICE_STATUS.CREDIT_NOTE_ISSUED,
  INVOICE_STATUS.DEBIT_NOTE_ISSUED,
  INVOICE_STATUS.DRAFT,
  INVOICE_STATUS.OVERDUE,
  INVOICE_STATUS.PAID,
  INVOICE_STATUS.PARTLY_PAID,
  INVOICE_STATUS.RETURN,
  INVOICE_STATUS.UNPAID,
]);

export const accountingPaymentTypeEnum = pgEnum("accounting_payment_type", [
  PAYMENT_TYPE.PAY,
  PAYMENT_TYPE.RECEIVE,
  PAYMENT_TYPE.TRANSFER,
]);

export const accountingDepreciationMethodEnum = pgEnum("accounting_depreciation_method", [
  DEPRECIATION_METHOD.DOUBLE_DECLINING_BALANCE,
  DEPRECIATION_METHOD.STRAIGHT_LINE,
  DEPRECIATION_METHOD.WRITTEN_DOWN_VALUE,
]);

export const accountingAssetStatusEnum = pgEnum("accounting_asset_status", [
  ASSET_STATUS.CANCELLED,
  ASSET_STATUS.CAPITALIZED,
  ASSET_STATUS.DRAFT,
  ASSET_STATUS.FULLY_DEPRECIATED,
  ASSET_STATUS.IN_MAINTENANCE,
  ASSET_STATUS.OUT_OF_ORDER,
  ASSET_STATUS.PARTLY_DEPRECIATED,
  ASSET_STATUS.SCRAPPED,
  ASSET_STATUS.SOLD,
  ASSET_STATUS.SUBMITTED,
]);

export const accountingChargeTypeEnum = pgEnum("accounting_charge_type", [
  CHARGE_TYPE.ACTUAL,
  CHARGE_TYPE.ON_NET_TOTAL,
  CHARGE_TYPE.ON_PREVIOUS_ROW,
]);

export const accountingJournalTypeEnum = pgEnum("accounting_journal_type", [
  JOURNAL_TYPE.BANK,
  JOURNAL_TYPE.CASH,
  JOURNAL_TYPE.CONTRA,
  JOURNAL_TYPE.DEPRECIATION,
  JOURNAL_TYPE.JOURNAL,
  JOURNAL_TYPE.OPENING,
  JOURNAL_TYPE.REVERSAL,
  JOURNAL_TYPE.WRITE_OFF,
]);

export const accountingQuotationStatusEnum = pgEnum("accounting_quotation_status", [
  QUOTATION_STATUS.CANCELLED,
  QUOTATION_STATUS.DRAFT,
  QUOTATION_STATUS.EXPIRED,
  QUOTATION_STATUS.ORDERED,
  QUOTATION_STATUS.SUBMITTED,
]);

export const accountingFiscalYearStatusEnum = pgEnum("accounting_fiscal_year_status", [
  FISCAL_YEAR_STATUS.CLOSED,
  FISCAL_YEAR_STATUS.OPEN,
]);

export const accountingDepreciationFrequencyEnum = pgEnum("accounting_depreciation_frequency", [
  DEPRECIATION_FREQUENCY.MONTHLY,
  DEPRECIATION_FREQUENCY.QUARTERLY,
  DEPRECIATION_FREQUENCY.YEARLY,
]);

export const accountingScheduleStatusEnum = pgEnum("accounting_schedule_status", [
  SCHEDULE_STATUS.CANCELLED,
  SCHEDULE_STATUS.POSTED,
  SCHEDULE_STATUS.SCHEDULED,
]);

export const accountingPartyTypeEnum = pgEnum("accounting_party_type", [
  PARTY_TYPE.CUSTOMER,
  PARTY_TYPE.VENDOR,
]);

export const accountingMaterialRequestTypeEnum = pgEnum("accounting_material_request_type", [
  MATERIAL_REQUEST_TYPE.MANUFACTURE,
  MATERIAL_REQUEST_TYPE.PURCHASE,
  MATERIAL_REQUEST_TYPE.TRANSFER,
]);

export const accountingBankMatchStatusEnum = pgEnum("accounting_bank_match_status", [
  BANK_MATCH_STATUS.MATCHED,
  BANK_MATCH_STATUS.RECONCILED,
  BANK_MATCH_STATUS.UNMATCHED,
]);
