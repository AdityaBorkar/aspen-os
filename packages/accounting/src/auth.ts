import { defineAcl } from "@aspen-os/platform/server";

export const acl = defineAcl({
  account: ["create", "read", "update", "disable"],
  asset: ["create", "read", "update", "transfer", "dispose", "depreciate"],
  delivery: ["create", "read", "update", "cancel"],
  fiscal_year: ["create", "read", "close"],
  material_request: ["create", "read", "update"],
  payment: ["create", "read", "cancel"],
  payment_term: ["create", "read", "update"],
  purchase_invoice: ["create", "read", "update", "cancel"],
  purchase_order: ["create", "read", "update", "cancel", "close"],
  quotation: ["create", "read", "update", "cancel"],
  receipt: ["create", "read", "cancel"],
  reconciliation: ["read", "reconcile", "unreconcile", "match"],
  report: ["read"],
  rfq: ["create", "read", "update"],
  sales_invoice: ["create", "read", "update", "cancel"],
  sales_order: ["create", "read", "update", "cancel", "close"],
  supplier_quotation: ["create", "read", "update"],
  tax_template: ["create", "read", "update"],
});
