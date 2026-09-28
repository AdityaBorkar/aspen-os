# Accounting Spec — `@aspen-os/accounting`

Status: draft · Module: `@aspen-os/accounting` (`$name = "accounting"`) · All tables tenant-scope, `accounting_` prefix
Sources (analyzed):

- https://frappe.io/erpnext/open-source-accounting
- https://frappe.io/erpnext/open-source-procurement
- https://frappe.io/erpnext/open-source-sales-invoicing
- Supporting detail: https://docs.frappe.io/erpnext/accounts, `/buying`, `/selling`, `/sales-invoice`, `/purchase-invoice`, `/payment-entry`, `/journal-entry`, `/chart-of-accounts`, `/payment-reconciliation`, `/purchase-order`, `/sales-order`, `/asset`

## 1. Goals / non-goals

Goals: single-tenant double-entry accounting + order-to-cash + procure-to-pay + asset register, integrated with Aspen OS masters/inventory/compliance/comms, with one-click financial statements and two reconciliation tools.

Non-goals (completely skipped per instruction — no tables, workflows, events, or reports for these):

1. Cost Centers, dimensions and budgeting (no `cost_center`, no accounting dimensions, no monthly budget splits).
2. Multi-company & multi-currency management (one legal entity = one tenant; one base currency; no consolidation, no inter-company orders/journal, no presentation-currency GL).
3. VAT (no VAT-specific ledgers, rules, returns, or e-invoicing; generic tax templates only — see §4.2).
4. Pricing rules (no automatic discount/margin engine; manual rates + manual line/order discounts only).
5. Blanket Orders (no rate-contract master, no contract-consumption validation).

## 2. Ubiquitous language (Aspen OS mapping)

| Term                            | Meaning in this module                                                                                                | Avoid / maps to                |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Tenant                          | The single company. No `Company` master; tenant = legal entity                                                        | Company master, multi-company  |
| Party                           | `masters` Entity (`customer`/`vendor`) + Contact + Address; never a local customer/supplier master                    | Local Customer/Supplier tables |
| Item / Warehouse / Stock Ledger | Owned by `@aspen-os/inventory` (stub today). Accounting stores soft-FK `item_id`/`warehouse_id`, never an item master | Local item/warehouse tables    |
| Payment Method config           | Owned by `masters.paymentMethods`; accounting references it as `mode_of_payment`                                      | Local Mode-of-Payment master   |
| UOM                             | Owned by `masters.unitsOfMeasure`; accounting validates `uom` + conversion factor against it                          | Local UOM                      |
| Voucher                         | Any submitted document that posts to GL (invoice, payment, journal, depreciation)                                     | —                              |
| Posting Date                    | Date that decides the fiscal year/period; subject to frozen/closed-period guard                                       | —                              |
| Outstanding                     | `grand_total - allocated - written_off`; drives AR/AP aging and statuses                                              | —                              |
| Reminder                        | Owned by `@aspen-os/calendar`; accounting only exposes overdue/due queries consumed via bridge                        | Local dunning engine           |
| Notification                    | Owned by `@aspen-os/comms`; accounting publishes intent events only                                                   | Local email/WhatsApp sender    |

## 3. Functional scope (ERPNext-parity minus §1 exclusions)

### 3.1 Chart of Accounts + General Ledger + Journals

- **F1 — Flexible Chart of Accounts (tree).** Group nodes organize, ledger (leaf) nodes post. Fields: `name`, `account_number?`, `parent_id`, `is_group`, `root_type` (`asset|liability|equity|income|expense`), `account_type` (`bank|cash|receivable|payable|tax|stock|fixed_asset|income|expense|equity|other`), `is_disabled`. Rules: group never posts; ledger never has children; cannot flip group↔ledger with children/postings; disable (never hard-delete) accounts with history; never one ledger per party — party balances live inside control accounts (`receivable`/`payable`). Import/migrate structure before opening balances; verify via draft voucher + GL preview.
- **F2 — General Ledger (immutable projection).** Every submitted voucher writes balanced GL rows; drafts write nothing. GL row: `voucher_type`, `voucher_id`, `account_id`, `party_type?`, `party_id?`, `debit`, `credit`, `posting_date`, `fiscal_year`. Supports drill-down to voucher, party-aggregate (total receivables per customer), voucher-filtered view. No direct GL writes — only via submit/cancel/reverse workflows.
- **F3 — Journal Entry (manual adjustment).** Balanced multi-row posting for accruals, transfers, opening balances, write-offs, reclassifications. Entry types (v1): `journal`, `opening`, `write_off`, `contra`, `bank`, `cash`, `depreciation`, `reversal`. Quick-entry (2-row) + reusable template (load-then-edit). Row fields: `account_id`, `debit|credit` (one side only), `party_type?`, `party_id?`, `reference_type?`, `reference_id?`, `is_advance?`. Total debit must equal total credit. `Reverse` creates a new draft with sides exchanged. Never use Journal for routine receipts/payments (use Payment Entry) and never reference a Payment Entry as a journal row.
- **F4 — Fiscal Year + Accounting Period guard.** `fiscal_year` (`name`, `start_date`, `end_date`, `status: open|closed`) + frozen/closed-period check on every posting date. Backdating blocked when period closed/frozen. Publishes `accounting.financial_year_started` (consumed by Compliance EventBridge for periodic obligations).

### 3.2 Taxes (generic, VAT excluded)

- **F5 — Sales / Purchase Taxes and Charges Templates.** Reusable header templates + manual row override. Charge types: `on_net_total`, `on_previous_row`, `actual`. Each row posts to its `account_head` (a `tax`-type ledger). Item Tax Template per row for item-specific rates. No VAT/GST logic, no jurisdiction localization, no e-invoice portal integration; tax-category selection is a plain label used to pick a template.

### 3.3 Sales — quotation to cash (order-to-cash)

- **F6 — Quotation.** Offer to Lead (prospect) or Customer: items, qty, rate, taxes, validity, terms. Print/email via comms. Convert to Sales Order without re-entry (carries lines/taxes/addresses). Status: `draft → submitted → ordered | expired | cancelled`.
- **F7 — Sales Order (commitment, no stock/GL effect).** Records customer, items, qty, rate, delivery dates (header + per-row split dates), warehouse (source), taxes, payment-terms schedule, customer PO ref. Actions: `update_items` (blocked against delivered/billed qty), `hold/resume`, `close` (forfeit remainder), `cancel+amend`. Create downstream: Delivery Note, Sales Invoice, Payment Entry (advance), Material Request / Purchase Order (for buy-or-make). Partial delivery/billing across many documents; order tracks `delivered%`, `billed%`. Status: `draft|to_deliver_and_bill|to_deliver|to_bill|completed|on_hold|closed|cancelled`.
- **F8 — Delivery Note (lightweight goods-issue proof).** Records goods leaving warehouse against a Sales Order. In v1 this is an accounting-owned fulfilment pointer (`sales_order_id`, `warehouse_id`, `item_id`, `qty`); full WMS/stock-ledger movement stays with inventory when it lands (accounting publishes `accounting.delivery_created`; inventory consumes). Never enable `update_stock` on the invoice when a Delivery Note already covered the movement.
- **F9 — Sales Invoice (receivable + income + tax).** Created from Sales Order / Delivery Note (preferred — updates billed%) or direct (service sale or counter sale with `update_stock=true`, which posts the single stock movement inline). Fields: customer, `posting_date`, `due_date` (from Payment Terms), currency = tenant base, items (qty/rate/uom/warehouse/income_account), taxes template, payment schedule, advances allocation, `is_return` (credit note), `is_rate_adjustment` (debit note), customer PO no/date, terms. Submit posts: debit receivable `grand_total`; credit income `net`; credit each tax account. Status: `draft|unpaid|partly_paid|paid|overdue|credit_note_issued|return|cancelled`. Corrections only via credit note / rate-adjustment debit note / cancel+amend (after unwinding links). `View Ledger` on every invoice.
- **F10 — Credit / Debit Notes (sales).** Credit note = return/reduction against an invoice (prefer create-from-original); debit note = rate adjustment retaining qty. Both are invoice rows with flags, not separate aggregates.
- **F11 — Payment Terms + Advances (sales).** Payment Terms Template generates the invoice payment schedule (split due dates/amounts). Advances (Receive payments before invoice) auto-allocate or reconcile later. Overdue derived from `due_date` vs today + outstanding > 0.

### 3.4 Purchase — request to pay (procure-to-pay)

- **F12 — Material Request (internal demand signal).** Department-level flag (`type: purchase|transfer|manufacture`, `required_by`) raised by sales/stores/manufacturing. Fulfilled via Purchase Order / RFQ. No GL effect.
- **F13 — Auto re-order signal.** Item `reorder_level` vs current stock comparison raises a purchase flag. Rule evaluation lives here; stock counts remain inventory-owned (v1: manual threshold import or event-consumed stock level; no AI forecasting).
- **F14 — Request for Quotation (RFQ).** Send item schedule to N suppliers (supplier portal link is comms-delivered). Responses collected as Supplier Quotations.
- **F15 — Supplier Quotation + comparison.** Line-by-line price comparison across suppliers for one RFQ; winner converts to Purchase Order. No auto-award in v1 (manual select).
- **F16 — Purchase Order (binding commitment, no GL effect).** Supplier, `required_by` (header + per-row), items (qty/rate/uom/target warehouse/expense account), taxes, order-level discount (on net or grand), payment schedule, terms. `Get Items From` (Material Request / Supplier Quotation / product bundle); `Update Rate as per Last Purchase`; `Link to Material Request`. Tracks `received%`, `billed%`. Create downstream: Purchase Receipt, Purchase Invoice, advance Payment. Status mirrors Sales Order (`to_receive_and_bill|to_receive|to_bill|completed|on_hold|closed|cancelled`).
- **F17 — Purchase Receipt (lightweight goods-receipt proof).** One-click delayed-receipt tracking; references PO; quality-check + put-away metadata carried as opaque fields for inventory handoff. Posts `Stock Received But Not Billed` clearing account on invoice (see F18). Same single-movement rule as F8: never `update_stock` on the invoice when a receipt exists.
- **F18 — Purchase Invoice (payable + expense/asset + tax).** From PO / Receipt (`Get Items From` merges several POs/receipts for one supplier bill) or direct (services, utilities, rent). Fields: supplier, `supplier_invoice_no` (duplicate-guarded per supplier) + `supplier_invoice_date`, `posting_date`, `due_date`, `credit_to` (payable control), items (billed qty/rate/expense account/warehouse), taxes, payment schedule, `on_hold` (blocks payment selection), `is_return` (debit note), generic withholding flag (rate only, no jurisdiction logic). Submit posts: credit payable `grand_total`; debit expense/asset/stock-or-SRBNB + each tax ledger; creates payment-ledger entries for AP aging. Status: `draft|unpaid|partly_paid|paid|overdue|return|debit_note_issued|cancelled`. Return via `Create → Return / Debit Note`.
- **F19 — Purchase returns (debit notes).** Traceable reduction/reversal of a supplier bill; same table with `is_return`.

### 3.5 Payments

- **F20 — Payment Entry (Receive / Pay / Internal Transfer).** The only routine money-movement voucher. `Receive`: debit bank/cash, credit receivable, reduce Sales Invoice outstanding. `Pay`: debit payable, credit bank/cash, reduce Purchase Invoice outstanding. `Internal Transfer`: bank/cash → bank/cash (no party). One party per entry; one entry may settle many invoices of that party (allocate per reference, allocated ≤ available). Supports full/partial/advance (unallocated remainder stays available), `mode_of_payment` → `masters.paymentMethod`, reference no/date (bank/cheque evidence), deductions/loss rows (fees, write-off, exchange diff — never in Taxes table). Advances created before invoice link/reconcile later. Approval-by-amount via platform workflow config (no local approval engine).
- **F21 — Bulk / on-hold handling.** `on_hold` purchase invoices excluded from payment selection; bulk settlement = one Payment Entry per party (no cross-party netting in v1; Payment Order file generation deferred to Phase 2).

### 3.6 Receivables / payables operations

- **F22 — AR / AP workbench.** Outstanding by invoice + by party, aging buckets, overdue filter, payment-term schedule view, `on_hold` quarantine. Automated follow-up nudges are calendar reminders + comms messages (accounting exposes `getOverdueInvoices`; it owns no sender).

### 3.7 Reconciliation

- **F23 — Payment Reconciliation.** Match submitted unallocated payments/credits (Payment Entries, eligible Journals) to outstanding invoices of the same party + same control account. FIFO auto-propose or manual select; editable `allocated_amount`; `Reconcile` updates references + outstanding balances with no new bank posting. `Unreconcile` reverses a bad link.
- **F24 — Bank Reconciliation.** Import bank statement lines; match to Payment Entries / bank GL entries by reference no/amount/date (manual match + FIFO propose). Resolves `bank vs books` difference; no GL reposting.

### 3.8 Assets

- **F25 — Asset register + lifecycle.** `asset` (`item_id` soft-FK to fixed-asset item, `asset_name`, `category_id`, `location_id`, `purchase_date`, `available_for_use_date`, `gross_value`, `quantity`, `custodian`, `status`). Supporting lookups: `asset_category` (depreciation defaults + ledger defaults), `asset_location` (v1-local; may migrate to `masters.orgBranches` later). Actions: `create` (from Purchase Invoice or direct for existing/composite assets), `transfer` (controlled movement with history — never direct location edit), `repair_log`, `sale` / `scrap` (disposal with ledger posting), `cancel` (only after unwinding linked depreciation/disposal). Insurance fields carried opaquely.
- **F26 — Automated depreciation.** Per-asset finance-book rows (`method: straight_line|written_down_value|double_declining_balance`, `useful_life`, `residual_value`, `frequency: monthly|quarterly|yearly`). Generates `depreciation_schedule` (expected date/amount/status); posting creates `depreciation` Journal Entries automatically (or via cron in Phase 2 — v1: explicit `post_due_depreciation` action). Opening accumulated depreciation supported for migrations. Status: `submitted|partly_depreciated|fully_depreciated|in_maintenance|out_of_order|sold|scrapped|capitalized`.

### 3.9 Reports (read projections, exportable)

- **F27 — Financial statements:** General Ledger, Trial Balance, Balance Sheet, Profit & Loss, Cash Flow (+ liquidity/performance indicators). Real-time, filterable by fiscal year/period/account/party.
- **F28 — Operational analytics:** AR/AP + aging, sales/purchase analysis, procurement tracker (request→quote→order→receipt→bill→pay chain), delayed receipt/delivery, pending delivery/billing, asset register + depreciation schedule, payment-terms outstanding.

### 3.10 Settings / masters owned here

- **F29 — Owned settings:** Fiscal Year, Accounting Period freeze, Payment Terms Template, Sales/Purchase Tax Templates, Terms and Conditions, Journal Entry Template, Asset Category/Location. Everything else by reference: parties/addresses (masters), payment-method config (masters), UOM (masters), items/warehouses/stock (inventory), reminders (calendar), delivery (comms), files/attachments (dms).

## 4. Document lifecycles + accounting effects

| Document                                                                   | Draft → …                                                                                | GL on submit (base currency, balanced)                                                            |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Sales Order / PO / Quotation / RFQ / Supplier Quotation / Material Request | `draft → submitted → (ordered/closed) \| on_hold \| closed \| cancelled(+amend)`         | None (commitments only; update `delivered/received/billed%` on downstream submit)                 |
| Delivery / Purchase Receipt                                                | `draft → submitted → (billed) \| cancelled`                                              | None in accounting v1 except SRBNB marker for receipts (stock movement owned by inventory)        |
| Sales Invoice                                                              | `draft → unpaid → partly_paid → paid`; `overdue` overlay; `credit_note_issued`; `return` | Dr Receivable (grand); Cr Income (net); Cr each tax                                               |
| Purchase Invoice                                                           | `draft → unpaid → partly_paid → paid`; `overdue` overlay; `debit_note_issued`; `return`  | Cr Payable (grand); Dr Expense/Asset/SRBNB; Dr each tax/duty per valuation flag                   |
| Payment Entry                                                              | `draft → submitted → (reconciled) \| cancelled`                                          | Receive: Dr Bank/Cash, Cr Receivable. Pay: Dr Payable, Cr Bank/Cash. Transfer: Dr dest, Cr source |
| Journal Entry                                                              | `draft → submitted → (reversed) \| cancelled`                                            | Exactly the entered balanced rows                                                                 |
| Asset depreciation                                                         | `scheduled → posted → (fully_depreciated)`                                               | Dr Depreciation expense; Cr Accumulated depreciation (via `depreciation` journal)                 |

Invariants: drafts never post; cancel reverses ledger per linked-document order (payments/returns/stock unwound first); submitted docs immutable (amend = cancel + new draft); one control account per reconciliation scope; `update_stock` invoice forbidden when delivery/receipt already moved the same qty; `allocated ≤ min(outstanding, available)`; `supplier_invoice_no` unique per supplier.

## 5. Domain events (`accounting.*`)

Produced (type-level contract; platform has no runtime side effects): `accounting.fiscal_year_started`, `accounting.quotation_submitted`, `accounting.sales_order_created|_updated|_closed|_cancelled`, `accounting.delivery_created`, `accounting.sales_invoice_created|_paid|_overdue|_cancelled`, `accounting.credit_note_issued`, `accounting.material_request_created`, `accounting.rfq_issued`, `accounting.supplier_quotation_received`, `accounting.purchase_order_created|_updated|_closed|_cancelled`, `accounting.receipt_created`, `accounting.purchase_invoice_created|_paid|_overdue|_cancelled`, `accounting.debit_note_issued`, `accounting.payment_created|_reconciled|_unreconciled`, `accounting.bank_matched`, `accounting.asset_created|_depreciated|_transferred|_disposed`.
Consumed (`$consumes`, introspection-only): `inventory.stock_changed` (reorder signal, receipt valuation), `masters.contact_created|_updated` (party defaults), `calendar.reminder_due` (none — accounting only exposes overdue queries), `comms.message_delivered` (quotation/RFQ send receipt, optional).

## 6. Integration map (no duplication)

| Needs                                                                | Owner                                                                  | Accounting behavior                                                             |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Customer/Supplier/Address/Contact                                    | `masters` (`entities`, `contacts`, `addresses`)                        | Soft-FK `party_id` (+ `party_type`); `$dependencies = ["masters"]`              |
| UOM + conversion                                                     | `masters.unitsOfMeasure`                                               | Validate row UOM; store factor snapshot                                         |
| Payment-method config, bank details                                  | `masters.paymentMethods` (inline bank fields; no `bank_account` table) | Reference only                                                                  |
| Items, price lists, warehouses, stock ledger, valuation, landed cost | `@aspen-os/inventory` (stub)                                           | Soft-FK `item_id`/`warehouse_id`; manual rates in v1; never a local item master |
| Reminders / dunning schedule                                         | `calendar` (single Reminder surface)                                   | Expose `getOverdueInvoices`; bridge creates `calendar_reminder` rows            |
| Inbox + out-of-band send (quotation, RFQ, dunning)                   | `comms`                                                                | Publish intent; sweeper delivers; never `comms.deliver` topic                   |
| Attachments (supplier bills, POs)                                    | `dms`                                                                  | Soft link `file_id`; never a local file store                                   |
| Periodic compliance (GST-return-style obligations)                   | `compliance` EventBridge on `accounting.financial_year_started`        | Emit event; own no compliance tables                                            |
| Dashboards / saved views                                             | `workspace` (`domain: "accounting:<entity>"`)                          | No local dashboard tables                                                       |

## 7. Proposed shape (Aspen OS conventions)

- `$name = "accounting"`, `$dependencies = ["masters"]`, units `db`, `pubsub` (+ `audit` from context). Runtime-wired only if depreciation cron adopted (register/unregister in `$prepareRuntime`/`$cleanup`); else stateless like `announcement`.
- Workflow groups (one action per file under `workflows/<entity>/<verb>.ts`): `p.accounting.accounts`, `p.accounting.fiscalYears`, `p.accounting.taxTemplates`, `p.accounting.paymentTerms`, `p.accounting.quotations`, `p.accounting.salesOrders`, `p.accounting.deliveries`, `p.accounting.salesInvoices`, `p.accounting.materialRequests`, `p.accounting.rfqs`, `p.accounting.supplierQuotations`, `p.accounting.purchaseOrders`, `p.accounting.receipts`, `p.accounting.purchaseInvoices`, `p.accounting.payments`, `p.accounting.reconciliation`, `p.accounting.assets`, `p.accounting.reports` (query-only).
- Tables (all tenant, `snake_case`, `id: uuidv7().primaryKey()`, `timestamptz`, `numeric()` money, no FKs, alphabetical columns): `accounting_account`, `accounting_asset`, `accounting_asset_category`, `accounting_asset_location`, `accounting_delivery_item`, `accounting_delivery_note`, `accounting_depreciation_schedule`, `accounting_fiscal_year`, `accounting_gl_entry` (append-only projection), `accounting_journal_entry`, `accounting_journal_line`, `accounting_material_request`, `accounting_material_request_item`, `accounting_payment_entry`, `accounting_payment_reference`, `accounting_payment_term_template`, `accounting_purchase_invoice`, `accounting_purchase_invoice_item`, `accounting_purchase_order`, `accounting_purchase_order_item`, `accounting_quotation`, `accounting_quotation_item`, `accounting_receipt_item`, `accounting_receipt_note`, `accounting_rfq`, `accounting_sales_invoice`, `accounting_sales_invoice_item`, `accounting_sales_order`, `accounting_sales_order_item`, `accounting_supplier_quotation`, `accounting_tax_rule`, `accounting_tax_template`. Enums (`accounting_*` pgEnums, lowercase values): `root_type`, `account_type`, `doc_status`, `order_status`, `invoice_status`, `payment_type`, `depreciation_method`, `asset_status`, `charge_type`.
- Validation: Valibot `Create<Entity>Schema / Update<Entity>Schema / <Entity>FiltersSchema`; `Workflow.input(schema)` + `parse` for narrowed checks; `stripUndefined()` on updates; `?? null` DB writes / `?? undefined` event payloads; DB-boundary camelCase→snake_case mapping.
- ACL (`src/auth.ts` via `defineAcl`): `account`, `fiscal_year`, `tax_template`, `quotation`, `sales_order`, `delivery`, `sales_invoice`, `material_request`, `rfq`, `supplier_quotation`, `purchase_order`, `receipt`, `purchase_invoice`, `payment`, `reconciliation`, `asset`, `report` (read-only).
- Indexes: `idx_<table>_<column>`; FK-less soft-FK indexes on `party_id`, `voucher_id`, `sales_order_id`, `purchase_order_id`, `account_id`, `posting_date`.

## 8. Explicit exclusions (do not build)

| Skipped                             | Why / what to do instead                                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Cost centers / dimensions / budgets | No columns, no reports; truncate ERPNext CoA guidance that says "prefer dimensions over new ledgers" — v1 prefers fewer ledgers |
| Multi-company / multi-currency      | No company picker, no exchange-rate, no consolidation; foreign-supplier bills entered in base currency                          |
| VAT                                 | Generic tax rows only; no VAT return/report; compliance bridge stays on `financial_year_started`, not VAT filings               |
| Pricing rules                       | Manual `rate` + line `%`/`amount` discount + order-level discount; ignore-pricing-rule flag meaningless in v1                   |
| Blanket orders                      | Long-term contracts tracked outside system; no contract-balance validation on orders                                            |

## 9. Phasing

- **MVP (this spec):** §§3–7 as above, manual rates, FIFO/manual reconciliation, explicit depreciation posting, standard + direct + service sale variants, standard buy + direct-bill variants.
- **Phase 2 (deferred, not in MVP):** Payment Order files, Landed Cost allocation, Auto-Repeat/subscriptions, dunning automation + Dunning doctype, drop-ship flow, subcontracting, POS/coupon/loyalty hooks, put-away/quality-check depth, e-invoice localizations, multi-warehouse reservation detail. Each needs its own ADR/spec — do not smuggle into MVP.

## 10. Open questions

1. Delivery/Receipt depth: keep v1 pointers in accounting (§F8/F17) or stub them until inventory lands? Recommendation: pointers + `inventory.stock_changed` consumption, full ledger move owned by inventory.
2. Asset Location: keep `accounting_asset_location` or reuse `masters.orgBranches` now? Recommendation: local lookup, migrate later via ADR.
3. Depreciation posting: explicit action (v1) vs `accounting.depreciation-scan` cron? Recommendation: explicit action; add cron only with `$prepareRuntime`/`$cleanup` wiring.
4. Withholding tax: keep generic rate field or drop until jurisdiction spec? Recommendation: keep single generic `withholding_rate` on purchase invoice, no slabs.
5. `accounting_gl_entry` as persisted projection vs pure view over vouchers? Recommendation: persisted append-only rows for drill-down + statements performance, written atomically with voucher submit.
