# Accounting Context

> Package: `@aspen-os/accounting`. Domain module for double-entry accounting — chart, fiscal years, journals/GL, order-to-cash, procure-to-pay, payments, reconciliation, assets, and reports.

## Relationship Type

Downstream of the Platform (Customer–Supplier). Stateless — `$initialize()`, `$prepareRuntime()`, `$cleanup()` are all empty (no units captured, no schedules, no subscriptions). `$dependencies = ["masters"]`, `$consumes` = 4 (`inventory.stock_changed`, `masters.contact_created/_updated`, `comms.message_delivered`) introspection-only, never validated, no runtime wiring.

## Structure (`packages/accounting/`)

- `Accounting.create(config?)` — factory; `$config: Required<AccountingModuleConfig> = { baseCurrency: "INR" }`
- `$name = "accounting"`, `$dependencies = ["masters"]`
- 21 workflow groups exposed as `readonly`: `accounts`, `fiscalYears`, `journals`, `journalTemplates`, `taxTemplates`, `termsTemplates`, `paymentTerms`, `quotations`, `salesOrders`, `deliveries`, `salesInvoices`, `materialRequests`, `rfqs`, `supplierQuotations`, `purchaseOrders`, `receipts`, `purchaseInvoices`, `payments`, `reconciliation`, `assets`, `reports` (137 actions total)
- 37 database tables (all `tenant_schemas`, `control_plane_schemas = {}`): `accounting_account`, `accounting_fiscal_year`, `accounting_journal_entry`, `accounting_journal_line`, `accounting_gl_entry`, 8 sales tables, 12 purchase tables, 3 payment tables, 4 asset tables, 3 tax tables, 2 settings tables — plus 17 `accounting_*` pgEnums in `tenant_schemas`
- 42 domain events published via PubSub (`AccountingEventMap` across 17 `*_EVENTS` maps)
- 18 ACL resources via `defineAcl()` (no `journal`/`journal_template`/`terms_template` entries)
- 9 services (`accounts`, `allocation`, `depreciation`, `fiscal`, `gl-queries`, `gl`, `invoice-common`, `payment-terms`, `totals`) + `workflow-steps/fetch-account.ts`

## Exposed on the platform instance

```
p.accounting.accounts           { create, list, get, update, disable }
p.accounting.fiscalYears        { create, get, list, close }
p.accounting.journals           { create, get, list, submit, cancel, reverse }
p.accounting.journalTemplates   { create, get, list, load }
p.accounting.taxTemplates       { create, get, list, update }
p.accounting.termsTemplates     { create, get, list }
p.accounting.paymentTerms       { create, get, list }
p.accounting.quotations         { create, list, get, submit, cancel, convert, expire }
p.accounting.salesOrders        { create, list, get, submit, cancel, close, hold, resume, updateItems }
p.accounting.deliveries         { create, list, get, cancel }
p.accounting.salesInvoices      { create, list, get, submit, cancel, createCreditNote, markOverdue, getOverdue, writeOff }
p.accounting.materialRequests   { create, list, get }
p.accounting.rfqs               { create, list, get }
p.accounting.supplierQuotations { create, list, get, convert, compare }
p.accounting.purchaseOrders     { create, list, get, submit, cancel, close, hold, resume, reorderSignal, updateRate }
p.accounting.receipts           { create, list, get, cancel }
p.accounting.purchaseInvoices   { create, list, get, submit, cancel, hold, releaseHold, createDebitNote, markOverdue, getOverdue, writeOff }
p.accounting.payments           { create, list, get, cancel }
p.accounting.reconciliation     { aging, getOverdue, importStatement, listBankLines, listUnallocated, matchBank, propose, proposeBank, reconcile, unreconcile }
p.accounting.assets             { create, get, list, submit, cancel, transfer, scrap, sell, logRepair, createCategory, listCategories, createLocation, listLocations, getSchedule, postDepreciation }
p.accounting.reports            { apAging, arAging, assetRegister, balanceSheet, cashFlow, delayed, generalLedger, paymentTermsOutstanding, pending, procurementTracker, profitAndLoss, purchaseAnalysis, salesAnalysis, trialBalance }
```

Workflows are one file per action under `workflows/<entity>/<verb>.ts`.

## Cross-context integration

- **Producer** for compliance: `accounting.financial_year_started` → compliance EventBridge creates monthly GST obligation. No longer a stub expectation — real package.
- **Introspection consumer** (docs/code `$consumes`, no subscriptions): `inventory.stock_changed` (GL posting trigger), `masters.contact_created/_updated`, `comms.message_delivered`.
- Inventory docs list `accounting.material_request_*/purchase_order_*/sales_order_*/receipt_*/delivery_*` as fulfilment pointers — accounting owns `% supplied` updates off `stock_changed`; no runtime coupling.

## Language

- Account, Fiscal Year, Journal Entry, GL Entry, Quotation, Sales Order, Delivery Note, Sales Invoice, Credit Note, Material Request, RFQ, Supplier Quotation, Purchase Order, Receipt Note, Purchase Invoice, Debit Note, Payment Entry, Reconciliation, Asset, Financial Report
- Avoid: Cost Center, Multi-company, Multi-currency, VAT (non-goals); Ledger (use GL Entry for projection, Journal for entry)
