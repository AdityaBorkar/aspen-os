# Accounting Domain Model

> Package: `@aspen-os/accounting`. Single-tenant double-entry accounting — chart of accounts, fiscal years, journals/GL, order-to-cash (quotation → sales order → delivery → sales invoice), procure-to-pay (material request → RFQ → supplier quotation → purchase order → receipt → purchase invoice), payments, two reconciliation tools, asset register, and financial statements. All 37 tables are tenant schemas (`accounting_` prefix). No cron schedules; `$consumes` is introspection-only (no runtime subscriptions).

## Entity-Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ACCOUNTING DOMAIN                             │
│                                                                      │
│  ┌──────────────┐   1:N ┌──────────────┐   1:N ┌──────────────┐       │
│  │   Account    │──────→│ JournalEntry │──────→│ JournalLine  │       │
│  │  code (uniq) │       │  status      │       │  accountId   │       │
│  │  rootType    │       │  type        │       │  debit/credit│       │
│  │  accountType │       └──────┬───────┘       └──────────────┘       │
│  └──────────────┘              │ post →                               │
│         ▲                      ▼                                      │
│         │              ┌──────────────┐                                │
│         │              │   GlEntry    │ (immutable projection)         │
│         │              └──────────────┘                                │
│  ┌──────────────┐                                                     │
│  │ FiscalYear   │──1:N── sales/purchase docs (postingDate ∈ year)      │
│  │  name (uniq) │       status: open|closed                            │
│  │  start/end   │                                                     │
│  └──────────────┘                                                     │
│                                                                      │
│  ORDER-TO-CASH (all header + item pairs):                             │
│  Quotation(+Item) → SalesOrder(+Item) → DeliveryNote(+Item)           │
│    → SalesInvoice(+Item) ──creditNote──→ SalesInvoice (is_return)     │
│                                                                      │
│  PROCURE-TO-PAY (all header + item pairs):                            │
│  MaterialRequest(+Item) → Rfq(+Item) → SupplierQuotation(+Item)       │
│    → PurchaseOrder(+Item) → ReceiptNote(+Item)                        │
│    → PurchaseInvoice(+Item) ──debitNote──→ PurchaseInvoice            │
│                                                                      │
│  ┌──────────────┐  1:N ┌──────────────┐                               │
│  │ PaymentEntry │──────→│PaymentReference│ (allocation invoice/order)  │
│  │  partyType   │      └──────────────┘                               │
│  │  paidAmount  │  ┌──────────────────┐                               │
│  └──────────────┘  │BankStatementLine │ (import → match → reconcile)  │
│                    └──────────────────┘                               │
│  ┌──────────────┐  1:N ┌──────────────┐                               │
│  │AssetCategory │──────→│    Asset     │──1:N── DepreciationSchedule   │
│  │AssetLocation │──┘    │  status      │                               │
│  └──────────────┘       └──────────────┘                               │
│  Templates: TaxTemplate(+TaxRule), PaymentTermTemplate,               │
│    TermsTemplate, JournalTemplate                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Aggregates

### Account (Aggregate Root)

**Identity**: `id` (text, UUID via `uuidv7`)

**Value objects**: `RootType` (asset/liability/equity/income/expense), `AccountType`, `DocStatus` (draft/submitted/cancelled), `PartyType` (customer/supplier).

**Invariants**:

- `code` unique per tenant; one control account per reconciliation scope.
- Drafts never post to GL. `submit` posts; `cancel` reverses per linked-document order.
- Submitted docs immutable — amend = cancel + new draft.
- `update_stock` invoices forbidden when a delivery/receipt already moved the same quantity.
- Supplier invoice numbers unique per supplier.

**Lifecycle commands** (via `p.accounting.accounts`): `create`, `list`, `get`, `update`, `disable`.

### Fiscal Year (Aggregate Root)

**Identity**: `id`; `name` unique.

**Invariants**: postings require open year; `close` freezes period; emits `accounting.fiscal_year_closed` + `accounting.financial_year_started` (consumed by compliance EventBridge → monthly GST obligation).

**Lifecycle commands** (via `p.accounting.fiscalYears`): `create`, `get`, `list`, `close`.

### Journal + GL (Aggregate Root)

**Identity**: `JournalEntry.id`; lines carry `accountId`, debit/credit; `GlEntry` is immutable projection.

**Lifecycle commands** (via `p.accounting.journals`): `create`, `get`, `list`, `submit` (posts), `cancel` (reverses), `reverse`.

### Order-to-Cash / Procure-to-Pay documents

Headers (`status`: draft/submitted/cancelled/closed/hold) + item rows. All follow `create/list/get/submit/cancel` plus stage extras (`convert`, `close/hold/resume`, `creditNote/debitNote`, `markOverdue/writeOff`, `compare`, `updateRate`). Reorder detection is singly owned by `inventory.reorder.breaches` — accounting holds no `reorderSignal` duplicate.

**Groups**: `quotations` (7), `salesOrders` (9), `deliveries` (4), `salesInvoices` (9), `materialRequests` (3), `rfqs` (3), `supplierQuotations` (5), `purchaseOrders` (9), `receipts` (4), `purchaseInvoices` (11), `payments` (4).

### Reconciliation + Reports

**Reconciliation** (10): `aging`, `getOverdue`, `importStatement`, `listBankLines`, `listUnallocated`, `matchBank`, `propose`, `proposeBank`, `reconcile`, `unreconcile`. Allocated amounts never exceed min(outstanding, available).

**Reports** (14, read-only): `balanceSheet`, `profitAndLoss`, `trialBalance`, `generalLedger`, `cashFlow`, `arAging`, `apAging`, `salesAnalysis`, `purchaseAnalysis`, `procurementTracker`, `pending`, `delayed`, `paymentTermsOutstanding`, `assetRegister`.

### Asset (Aggregate Root)

**Identity**: `id`; `AssetCategory` + `AssetLocation` masters; `DepreciationSchedule` rows per frequency.

**Lifecycle commands** (via `p.accounting.assets`, 15): `create/get/list/submit/cancel/transfer/scrap/sell/logRepair/createCategory/listCategories/createLocation/listLocations/getSchedule/postDepreciation`.

## Domain Events — 42

Fiscal years (2): `accounting.fiscal_year_closed`, `accounting.financial_year_started`. Quotations (3): `quotation_submitted/_cancelled/_converted`. Sales orders (4): `sales_order_created/_updated/_cancelled/_closed`. Deliveries (2): `delivery_created/_cancelled`. Sales invoices (4): `sales_invoice_created/_cancelled/_paid/_overdue` + `credit_note_issued` (1). Material requests (1): `material_request_created`. RFQs (1): `rfq_issued`. Supplier quotations (2): `supplier_quotation_received/_converted`. Purchase orders (4): `purchase_order_created/_updated/_cancelled/_closed`. Receipts (2): `receipt_created/_cancelled`. Purchase invoices (4): `purchase_invoice_created/_cancelled/_paid/_overdue` + `debit_note_issued` (1). Payments (3): `payment_created/_reconciled/_unreconciled`. Bank (1): `bank_matched`. Assets (4): `asset_created/_transferred/_disposed/_depreciated`. Journals (3): `journal_posted/_cancelled/_reversed`.

`$consumes` (introspection-only, no runtime wiring): `inventory.stock_changed`, `masters.contact_created`, `masters.contact_updated`, `comms.message_delivered`.

## Command-Query Separation

| Context    | Command               | Method                                    |
| ---------- | --------------------- | ----------------------------------------- |
| Accounting | Create account        | `p.accounting.accounts.create()`          |
| Accounting | Submit journal        | `p.accounting.journals.submit()`          |
| Accounting | Submit sales invoice  | `p.accounting.salesInvoices.submit()`     |
| Accounting | Submit purchase order | `p.accounting.purchaseOrders.submit()`    |
| Accounting | Reconcile payment     | `p.accounting.reconciliation.reconcile()` |
| Accounting | Post depreciation     | `p.accounting.assets.postDepreciation()`  |

| Context    | Query           | Method                                 |
| ---------- | --------------- | -------------------------------------- |
| Accounting | List accounts   | `p.accounting.accounts.list()`         |
| Accounting | AR/AP aging     | `p.accounting.reconciliation.aging()`  |
| Accounting | Balance sheet   | `p.accounting.reports.balanceSheet()`  |
| Accounting | Profit and loss | `p.accounting.reports.profitAndLoss()` |
| Accounting | Trial balance   | `p.accounting.reports.trialBalance()`  |

## Invariants & Business Rules

6. **Drafts never post** — only `submit` writes GL entries.
7. **Cancel reverses per linked-document order** — downstream docs reversed first.
8. **Submitted docs immutable** — amend = cancel + new draft.
9. **One control account per reconciliation scope**.
10. **`update_stock` guard** — stock-affecting invoices forbidden when delivery/receipt already moved the quantity.
11. **Allocation cap** — allocated ≤ min(outstanding, available).
12. **Supplier invoice uniqueness** — invoice number unique per supplier.
