export { accountingAccount } from "#/db-schemas/chart";
export { accountingFiscalYear } from "#/db-schemas/chart";
export { accountingGlEntry } from "#/db-schemas/chart";
export { accountingJournalEntry } from "#/db-schemas/chart";
export { accountingJournalLine } from "#/db-schemas/chart";
export { accountingPaymentTermTemplate } from "#/db-schemas/tax";
export { accountingTaxRule } from "#/db-schemas/tax";
export { accountingTaxTemplate } from "#/db-schemas/tax";
export { accountingDeliveryItem } from "#/db-schemas/sales";
export { accountingDeliveryNote } from "#/db-schemas/sales";
export { accountingQuotation } from "#/db-schemas/sales";
export { accountingQuotationItem } from "#/db-schemas/sales";
export { accountingSalesInvoice } from "#/db-schemas/sales";
export { accountingSalesInvoiceItem } from "#/db-schemas/sales";
export { accountingSalesOrder } from "#/db-schemas/sales";
export { accountingSalesOrderItem } from "#/db-schemas/sales";
export { accountingMaterialRequest } from "#/db-schemas/purchase";
export { accountingMaterialRequestItem } from "#/db-schemas/purchase";
export { accountingPurchaseInvoice } from "#/db-schemas/purchase";
export { accountingPurchaseInvoiceItem } from "#/db-schemas/purchase";
export { accountingPurchaseOrder } from "#/db-schemas/purchase";
export { accountingPurchaseOrderItem } from "#/db-schemas/purchase";
export { accountingReceiptItem } from "#/db-schemas/purchase";
export { accountingReceiptNote } from "#/db-schemas/purchase";
export { accountingRfq } from "#/db-schemas/purchase";
export { accountingRfqItem } from "#/db-schemas/purchase";
export { accountingSupplierQuotation } from "#/db-schemas/purchase";
export { accountingSupplierQuotationItem } from "#/db-schemas/purchase";
export { accountingBankStatementLine } from "#/db-schemas/payment";
export { accountingPaymentEntry } from "#/db-schemas/payment";
export { accountingPaymentReference } from "#/db-schemas/payment";
export { accountingAsset } from "#/db-schemas/asset";
export { accountingAssetCategory } from "#/db-schemas/asset";
export { accountingAssetLocation } from "#/db-schemas/asset";
export { accountingDepreciationSchedule } from "#/db-schemas/asset";
export { accountingJournalTemplate } from "#/db-schemas/settings";
export { accountingTermsTemplate } from "#/db-schemas/settings";
export * from "#/db-schemas/enums";

import {
  accountingAsset,
  accountingAssetCategory,
  accountingAssetLocation,
  accountingDepreciationSchedule,
} from "#/db-schemas/asset";
import {
  accountingAccount,
  accountingFiscalYear,
  accountingGlEntry,
  accountingJournalEntry,
  accountingJournalLine,
} from "#/db-schemas/chart";
import {
  accountingAccountTypeEnum,
  accountingAssetStatusEnum,
  accountingBankMatchStatusEnum,
  accountingChargeTypeEnum,
  accountingDepreciationFrequencyEnum,
  accountingDepreciationMethodEnum,
  accountingDocStatusEnum,
  accountingFiscalYearStatusEnum,
  accountingInvoiceStatusEnum,
  accountingJournalTypeEnum,
  accountingMaterialRequestTypeEnum,
  accountingOrderStatusEnum,
  accountingPartyTypeEnum,
  accountingPaymentTypeEnum,
  accountingQuotationStatusEnum,
  accountingRootTypeEnum,
  accountingScheduleStatusEnum,
} from "#/db-schemas/enums";
import {
  accountingBankStatementLine,
  accountingPaymentEntry,
  accountingPaymentReference,
} from "#/db-schemas/payment";
import {
  accountingMaterialRequest,
  accountingMaterialRequestItem,
  accountingPurchaseInvoice,
  accountingPurchaseInvoiceItem,
  accountingPurchaseOrder,
  accountingPurchaseOrderItem,
  accountingReceiptItem,
  accountingReceiptNote,
  accountingRfq,
  accountingRfqItem,
  accountingSupplierQuotation,
  accountingSupplierQuotationItem,
} from "#/db-schemas/purchase";
import {
  accountingDeliveryItem,
  accountingDeliveryNote,
  accountingQuotation,
  accountingQuotationItem,
  accountingSalesInvoice,
  accountingSalesInvoiceItem,
  accountingSalesOrder,
  accountingSalesOrderItem,
} from "#/db-schemas/sales";
import { accountingJournalTemplate, accountingTermsTemplate } from "#/db-schemas/settings";
import {
  accountingPaymentTermTemplate,
  accountingTaxRule,
  accountingTaxTemplate,
} from "#/db-schemas/tax";

export const accountingTables = {
  accountingAccount,
  accountingAsset,
  accountingAssetCategory,
  accountingAssetLocation,
  accountingBankStatementLine,
  accountingDeliveryItem,
  accountingDeliveryNote,
  accountingDepreciationSchedule,
  accountingFiscalYear,
  accountingGlEntry,
  accountingJournalEntry,
  accountingJournalLine,
  accountingJournalTemplate,
  accountingMaterialRequest,
  accountingMaterialRequestItem,
  accountingPaymentEntry,
  accountingPaymentReference,
  accountingPaymentTermTemplate,
  accountingPurchaseInvoice,
  accountingPurchaseInvoiceItem,
  accountingPurchaseOrder,
  accountingPurchaseOrderItem,
  accountingQuotation,
  accountingQuotationItem,
  accountingReceiptItem,
  accountingReceiptNote,
  accountingRfq,
  accountingRfqItem,
  accountingSalesInvoice,
  accountingSalesInvoiceItem,
  accountingSalesOrder,
  accountingSalesOrderItem,
  accountingSupplierQuotation,
  accountingSupplierQuotationItem,
  accountingTaxRule,
  accountingTaxTemplate,
  accountingTermsTemplate,
} as const;

export const control_plane_schemas = {} as const;

export const tenant_schemas = {
  ...accountingTables,
  accountingAccountTypeEnum,
  accountingAssetStatusEnum,
  accountingBankMatchStatusEnum,
  accountingChargeTypeEnum,
  accountingDepreciationFrequencyEnum,
  accountingDepreciationMethodEnum,
  accountingDocStatusEnum,
  accountingFiscalYearStatusEnum,
  accountingInvoiceStatusEnum,
  accountingJournalTypeEnum,
  accountingMaterialRequestTypeEnum,
  accountingOrderStatusEnum,
  accountingPartyTypeEnum,
  accountingPaymentTypeEnum,
  accountingQuotationStatusEnum,
  accountingRootTypeEnum,
  accountingScheduleStatusEnum,
} as const;
