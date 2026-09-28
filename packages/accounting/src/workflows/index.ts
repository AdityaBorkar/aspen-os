import { createAccount } from "#/workflows/account/create";
import { disableAccount } from "#/workflows/account/disable";
import { getAccount } from "#/workflows/account/get";
import { listAccounts } from "#/workflows/account/list";
import { updateAccount } from "#/workflows/account/update";
import { cancelAsset } from "#/workflows/asset/cancel";
import { createAsset } from "#/workflows/asset/create";
import { createAssetCategory } from "#/workflows/asset/create-category";
import { createAssetLocation } from "#/workflows/asset/create-location";
import { getAsset } from "#/workflows/asset/get";
import { getDepreciationSchedule } from "#/workflows/asset/get-schedule";
import { listAssets } from "#/workflows/asset/list";
import { listAssetCategories } from "#/workflows/asset/list-categories";
import { listAssetLocations } from "#/workflows/asset/list-locations";
import { logAssetRepair } from "#/workflows/asset/log-repair";
import { postDueDepreciation } from "#/workflows/asset/post-depreciation";
import { scrapAsset } from "#/workflows/asset/scrap";
import { sellAsset } from "#/workflows/asset/sell";
import { submitAsset } from "#/workflows/asset/submit";
import { transferAsset } from "#/workflows/asset/transfer";
import { cancelDeliveryNote } from "#/workflows/delivery/cancel";
import { createDeliveryNote } from "#/workflows/delivery/create";
import { getDeliveryNote } from "#/workflows/delivery/get";
import { listDeliveryNotes } from "#/workflows/delivery/list";
import { closeFiscalYear } from "#/workflows/fiscal-year/close";
import { createFiscalYear } from "#/workflows/fiscal-year/create";
import { getFiscalYear } from "#/workflows/fiscal-year/get";
import { listFiscalYears } from "#/workflows/fiscal-year/list";
import { createJournalTemplate } from "#/workflows/journal-template/create";
import { getJournalTemplate } from "#/workflows/journal-template/get";
import { listJournalTemplates } from "#/workflows/journal-template/list";
import { loadJournalTemplate } from "#/workflows/journal-template/load";
import { cancelJournalEntry } from "#/workflows/journal/cancel";
import { createJournalEntry } from "#/workflows/journal/create";
import { getJournalEntry } from "#/workflows/journal/get";
import { listJournalEntries } from "#/workflows/journal/list";
import { reverseJournalEntry } from "#/workflows/journal/reverse";
import { submitJournalEntry } from "#/workflows/journal/submit";
import { createMaterialRequest } from "#/workflows/material-request/create";
import { getMaterialRequest } from "#/workflows/material-request/get";
import { listMaterialRequests } from "#/workflows/material-request/list";
import { createPaymentTermTemplate } from "#/workflows/payment-term/create";
import { getPaymentTermTemplate } from "#/workflows/payment-term/get";
import { listPaymentTermTemplates } from "#/workflows/payment-term/list";
import { cancelPaymentEntry } from "#/workflows/payment/cancel";
import { createPaymentEntry } from "#/workflows/payment/create";
import { getPaymentEntry } from "#/workflows/payment/get";
import { listPaymentEntries } from "#/workflows/payment/list";
import { cancelPurchaseInvoice } from "#/workflows/purchase-invoice/cancel";
import { createPurchaseInvoice } from "#/workflows/purchase-invoice/create";
import { createDebitNote } from "#/workflows/purchase-invoice/debit-note";
import { getPurchaseInvoice } from "#/workflows/purchase-invoice/get";
import { holdPurchaseInvoice } from "#/workflows/purchase-invoice/hold";
import { listPurchaseInvoices } from "#/workflows/purchase-invoice/list";
import { markPurchaseOverdue } from "#/workflows/purchase-invoice/mark-overdue";
import { getOverduePurchaseInvoices } from "#/workflows/purchase-invoice/overdue";
import { releasePurchaseInvoiceHold } from "#/workflows/purchase-invoice/release-hold";
import { submitPurchaseInvoice } from "#/workflows/purchase-invoice/submit";
import { writeOffPurchaseInvoice } from "#/workflows/purchase-invoice/write-off";
import { cancelPurchaseOrder } from "#/workflows/purchase-order/cancel";
import { closePurchaseOrder } from "#/workflows/purchase-order/close";
import { createPurchaseOrder } from "#/workflows/purchase-order/create";
import { getPurchaseOrder } from "#/workflows/purchase-order/get";
import { holdPurchaseOrder } from "#/workflows/purchase-order/hold";
import { listPurchaseOrders } from "#/workflows/purchase-order/list";
import { reorderSignal } from "#/workflows/purchase-order/reorder-signal";
import { resumePurchaseOrder } from "#/workflows/purchase-order/resume";
import { submitPurchaseOrder } from "#/workflows/purchase-order/submit";
import { updateRateFromLastPurchase } from "#/workflows/purchase-order/update-rate";
import { cancelQuotation } from "#/workflows/quotation/cancel";
import { convertQuotation } from "#/workflows/quotation/convert";
import { createQuotation } from "#/workflows/quotation/create";
import { expireQuotation } from "#/workflows/quotation/expire";
import { getQuotation } from "#/workflows/quotation/get";
import { listQuotations } from "#/workflows/quotation/list";
import { submitQuotation } from "#/workflows/quotation/submit";
import { cancelReceiptNote } from "#/workflows/receipt/cancel";
import { createReceiptNote } from "#/workflows/receipt/create";
import { getReceiptNote } from "#/workflows/receipt/get";
import { listReceiptNotes } from "#/workflows/receipt/list";
import { agingReport } from "#/workflows/reconciliation/aging";
import { listBankStatementLines } from "#/workflows/reconciliation/bank-lines";
import { importBankStatement } from "#/workflows/reconciliation/import-statement";
import { matchBankLine } from "#/workflows/reconciliation/match-bank";
import { getOverdueInvoices } from "#/workflows/reconciliation/overdue";
import { proposeReconciliation } from "#/workflows/reconciliation/propose";
import { proposeBankMatches } from "#/workflows/reconciliation/propose-bank";
import { reconcilePayment } from "#/workflows/reconciliation/reconcile";
import { listUnallocatedPayments } from "#/workflows/reconciliation/unallocated";
import { unreconcilePayment } from "#/workflows/reconciliation/unreconcile";
import { apAging } from "#/workflows/report/ap-aging";
import { arAging } from "#/workflows/report/ar-aging";
import { assetRegister } from "#/workflows/report/asset-register";
import { balanceSheet } from "#/workflows/report/balance-sheet";
import { cashFlow } from "#/workflows/report/cash-flow";
import { delayedReceiptDelivery } from "#/workflows/report/delayed";
import { generalLedger } from "#/workflows/report/general-ledger";
import { paymentTermsOutstanding } from "#/workflows/report/payment-terms-outstanding";
import { pendingDeliveryBilling } from "#/workflows/report/pending";
import { procurementTracker } from "#/workflows/report/procurement-tracker";
import { profitAndLoss } from "#/workflows/report/profit-loss";
import { purchaseAnalysis } from "#/workflows/report/purchase-analysis";
import { salesAnalysis } from "#/workflows/report/sales-analysis";
import { trialBalance } from "#/workflows/report/trial-balance";
import { createRfq } from "#/workflows/rfq/create";
import { getRfq } from "#/workflows/rfq/get";
import { listRfqs } from "#/workflows/rfq/list";
import { cancelSalesInvoice } from "#/workflows/sales-invoice/cancel";
import { createSalesInvoice } from "#/workflows/sales-invoice/create";
import { createCreditNote } from "#/workflows/sales-invoice/credit-note";
import { getSalesInvoice } from "#/workflows/sales-invoice/get";
import { listSalesInvoices } from "#/workflows/sales-invoice/list";
import { markSalesOverdue } from "#/workflows/sales-invoice/mark-overdue";
import { getOverdueSalesInvoices } from "#/workflows/sales-invoice/overdue";
import { submitSalesInvoice } from "#/workflows/sales-invoice/submit";
import { writeOffSalesInvoice } from "#/workflows/sales-invoice/write-off";
import { cancelSalesOrder } from "#/workflows/sales-order/cancel";
import { closeSalesOrder } from "#/workflows/sales-order/close";
import { createSalesOrder } from "#/workflows/sales-order/create";
import { getSalesOrder } from "#/workflows/sales-order/get";
import { holdSalesOrder } from "#/workflows/sales-order/hold";
import { listSalesOrders } from "#/workflows/sales-order/list";
import { resumeSalesOrder } from "#/workflows/sales-order/resume";
import { submitSalesOrder } from "#/workflows/sales-order/submit";
import { updateSalesOrderItems } from "#/workflows/sales-order/update-items";
import { compareSupplierQuotations } from "#/workflows/supplier-quotation/compare";
import { convertSupplierQuotation } from "#/workflows/supplier-quotation/convert";
import { createSupplierQuotation } from "#/workflows/supplier-quotation/create";
import { getSupplierQuotation } from "#/workflows/supplier-quotation/get";
import { listSupplierQuotations } from "#/workflows/supplier-quotation/list";
import { createTaxTemplate } from "#/workflows/tax-template/create";
import { getTaxTemplate } from "#/workflows/tax-template/get";
import { listTaxTemplates } from "#/workflows/tax-template/list";
import { updateTaxTemplate } from "#/workflows/tax-template/update";
import { createTermsTemplate } from "#/workflows/terms/create";
import { getTermsTemplate } from "#/workflows/terms/get";
import { listTermsTemplates } from "#/workflows/terms/list";

export const accounts = {
  create: createAccount,
  disable: disableAccount,
  get: getAccount,
  list: listAccounts,
  update: updateAccount,
} as const;

export const fiscalYears = {
  close: closeFiscalYear,
  create: createFiscalYear,
  get: getFiscalYear,
  list: listFiscalYears,
} as const;

export const journals = {
  cancel: cancelJournalEntry,
  create: createJournalEntry,
  get: getJournalEntry,
  list: listJournalEntries,
  reverse: reverseJournalEntry,
  submit: submitJournalEntry,
} as const;

export const taxTemplates = {
  create: createTaxTemplate,
  get: getTaxTemplate,
  list: listTaxTemplates,
  update: updateTaxTemplate,
} as const;

export const termsTemplates = {
  create: createTermsTemplate,
  get: getTermsTemplate,
  list: listTermsTemplates,
} as const;

export const journalTemplates = {
  create: createJournalTemplate,
  get: getJournalTemplate,
  list: listJournalTemplates,
  load: loadJournalTemplate,
} as const;

export const paymentTerms = {
  create: createPaymentTermTemplate,
  get: getPaymentTermTemplate,
  list: listPaymentTermTemplates,
} as const;

export const quotations = {
  cancel: cancelQuotation,
  convert: convertQuotation,
  create: createQuotation,
  expire: expireQuotation,
  get: getQuotation,
  list: listQuotations,
  submit: submitQuotation,
} as const;

export const salesOrders = {
  cancel: cancelSalesOrder,
  close: closeSalesOrder,
  create: createSalesOrder,
  get: getSalesOrder,
  hold: holdSalesOrder,
  list: listSalesOrders,
  resume: resumeSalesOrder,
  submit: submitSalesOrder,
  updateItems: updateSalesOrderItems,
} as const;

export const deliveries = {
  cancel: cancelDeliveryNote,
  create: createDeliveryNote,
  get: getDeliveryNote,
  list: listDeliveryNotes,
} as const;

export const salesInvoices = {
  cancel: cancelSalesInvoice,
  create: createSalesInvoice,
  createCreditNote,
  get: getSalesInvoice,
  getOverdue: getOverdueSalesInvoices,
  list: listSalesInvoices,
  markOverdue: markSalesOverdue,
  submit: submitSalesInvoice,
  writeOff: writeOffSalesInvoice,
} as const;

export const materialRequests = {
  create: createMaterialRequest,
  get: getMaterialRequest,
  list: listMaterialRequests,
} as const;

export const rfqs = {
  create: createRfq,
  get: getRfq,
  list: listRfqs,
} as const;

export const supplierQuotations = {
  compare: compareSupplierQuotations,
  convert: convertSupplierQuotation,
  create: createSupplierQuotation,
  get: getSupplierQuotation,
  list: listSupplierQuotations,
} as const;

export const purchaseOrders = {
  cancel: cancelPurchaseOrder,
  close: closePurchaseOrder,
  create: createPurchaseOrder,
  get: getPurchaseOrder,
  hold: holdPurchaseOrder,
  list: listPurchaseOrders,
  reorderSignal,
  resume: resumePurchaseOrder,
  submit: submitPurchaseOrder,
  updateRate: updateRateFromLastPurchase,
} as const;

export const receipts = {
  cancel: cancelReceiptNote,
  create: createReceiptNote,
  get: getReceiptNote,
  list: listReceiptNotes,
} as const;

export const purchaseInvoices = {
  cancel: cancelPurchaseInvoice,
  create: createPurchaseInvoice,
  createDebitNote,
  get: getPurchaseInvoice,
  getOverdue: getOverduePurchaseInvoices,
  hold: holdPurchaseInvoice,
  list: listPurchaseInvoices,
  markOverdue: markPurchaseOverdue,
  releaseHold: releasePurchaseInvoiceHold,
  submit: submitPurchaseInvoice,
  writeOff: writeOffPurchaseInvoice,
} as const;

export const payments = {
  cancel: cancelPaymentEntry,
  create: createPaymentEntry,
  get: getPaymentEntry,
  list: listPaymentEntries,
} as const;

export const reconciliation = {
  aging: agingReport,
  getOverdue: getOverdueInvoices,
  importStatement: importBankStatement,
  listBankLines: listBankStatementLines,
  listUnallocated: listUnallocatedPayments,
  matchBank: matchBankLine,
  propose: proposeReconciliation,
  proposeBank: proposeBankMatches,
  reconcile: reconcilePayment,
  unreconcile: unreconcilePayment,
} as const;

export const assets = {
  cancel: cancelAsset,
  create: createAsset,
  createCategory: createAssetCategory,
  createLocation: createAssetLocation,
  get: getAsset,
  getSchedule: getDepreciationSchedule,
  list: listAssets,
  listCategories: listAssetCategories,
  listLocations: listAssetLocations,
  logRepair: logAssetRepair,
  postDepreciation: postDueDepreciation,
  scrap: scrapAsset,
  sell: sellAsset,
  submit: submitAsset,
  transfer: transferAsset,
} as const;

export const reports = {
  apAging,
  arAging,
  assetRegister,
  balanceSheet,
  cashFlow,
  delayed: delayedReceiptDelivery,
  generalLedger,
  paymentTermsOutstanding,
  pending: pendingDeliveryBilling,
  procurementTracker,
  profitAndLoss,
  purchaseAnalysis,
  salesAnalysis,
  trialBalance,
} as const;
