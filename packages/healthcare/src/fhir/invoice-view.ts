import type { HealthcareInvoice } from "#/db-schemas/billing";
import type { HealthcareInvoiceLine } from "#/db-schemas/invoice-line";

import { is, object, optional, string } from "valibot";
import type { InferOutput } from "valibot";

import type { FhirExtensionInput } from "./fhir-extension";
import { INVOICE_STATUS_MAP } from "./registries";
import type { InvoiceStatusCanonical } from "./registries";

export interface FhirInvoiceBundle {
  chargeItems: FhirChargeItemView[];
  invoice: FhirInvoiceView;
}

export type FhirChargeItemStatus =
  | "aborted"
  | "billable"
  | "billed"
  | "entered-in-error"
  | "not-billable"
  | "planned"
  | "unknown";

export interface FhirMoney {
  currency: string;
  value: number;
}

export interface FhirInvoiceView {
  amountPaid: FhirMoney;
  balance: FhirMoney;
  date: string;
  encounter: string | null;
  extension: FhirExtensionInput[];
  id: string;
  identifier: string;
  resourceType: "Invoice";
  status: InvoiceStatusCanonical;
  subject: string;
  totalGross: FhirMoney;
}

export interface FhirChargeItemView {
  context: string;
  encounter: string | null;
  enteredDate: string;
  extension: FhirExtensionInput[];
  id: string;
  price: FhirMoney;
  quantity: number;
  resourceType: "ChargeItem";
  service: string | null;
  status: FhirChargeItemStatus;
  subject: string;
  totalPrice: FhirMoney;
}

const INVOICE_STATUS_VIEW = {
  draft: INVOICE_STATUS_MAP.DRAFT,
  final: INVOICE_STATUS_MAP.FINAL,
  paid: INVOICE_STATUS_MAP.PAID,
  partial: INVOICE_STATUS_MAP.PARTIAL,
} as const;

const DEFAULT_CURRENCY = "INR";

const InvoiceFhirOverlaySchema = object({
  currency: optional(string()),
});

type InvoiceFhirOverlay = InferOutput<typeof InvoiceFhirOverlaySchema>;

function readOverlay(payload: HealthcareInvoice["payload"]): InvoiceFhirOverlay | null {
  if (payload === null || payload === undefined) {
    return null;
  }
  const raw = payload.fhir;
  if (raw instanceof Date || Array.isArray(raw)) {
    return null;
  }
  return is(InvoiceFhirOverlaySchema, raw) ? raw : null;
}

function mapChargeItemStatus(raw: string): FhirChargeItemStatus {
  const normalized = raw.trim().toLowerCase();
  if (normalized === "active" || normalized === "billable") {
    return "billable";
  }
  if (normalized === "billed") {
    return "billed";
  }
  if (normalized === "void" || normalized === "voided" || normalized === "cancelled") {
    return "aborted";
  }
  if (normalized === "entered-in-error") {
    return "entered-in-error";
  }
  if (normalized === "planned") {
    return "planned";
  }
  if (normalized === "not-billable") {
    return "not-billable";
  }
  return "unknown";
}

function isKnownChargeItemStatus(raw: string): boolean {
  const normalized = raw.trim().toLowerCase();
  if (normalized === "active" || normalized === "billable" || normalized === "billed") {
    return true;
  }
  if (normalized === "void" || normalized === "voided" || normalized === "cancelled") {
    return true;
  }
  if (
    normalized === "entered-in-error" ||
    normalized === "planned" ||
    normalized === "not-billable"
  ) {
    return true;
  }
  return false;
}

export function toFhirChargeItemSet(
  header: HealthcareInvoice,
  lines: HealthcareInvoiceLine[],
): FhirChargeItemView[] {
  const overlay = readOverlay(header.payload);
  const currency = overlay?.currency ?? DEFAULT_CURRENCY;
  return lines.map((line) => {
    const price = Number(line.price);
    const unitPrice = Number.isFinite(price) ? price : 0;
    const extension: FhirExtensionInput[] = [];
    if (line.source !== null) {
      extension.push({ url: "urn:aspen-os:pricing-source", valueString: line.source });
    }
    if (!isKnownChargeItemStatus(line.status) && line.status.trim().length > 0) {
      extension.push({ url: "urn:aspen-os:legacy-status", valueString: line.status });
    }
    return {
      context: `Invoice/${header.id}`,
      encounter: header.encounter_id === null ? null : `Encounter/${header.encounter_id}`,
      enteredDate: line.created_at.toISOString(),
      extension,
      id: line.id,
      price: { currency, value: unitPrice },
      quantity: line.qty,
      resourceType: "ChargeItem",
      service: line.service_id,
      status: mapChargeItemStatus(line.status),
      subject: `Patient/${line.patient_id ?? header.patient_id}`,
      totalPrice: { currency, value: unitPrice * line.qty },
    };
  });
}

export function toFhirInvoiceView(
  header: HealthcareInvoice,
  lines: HealthcareInvoiceLine[],
): FhirInvoiceBundle {
  const overlay = readOverlay(header.payload);
  const currency = overlay?.currency ?? DEFAULT_CURRENCY;
  const total = Number(header.total);
  const paid = Number(header.paid);
  const totalGross = Number.isFinite(total) ? total : 0;
  const amountPaid = Number.isFinite(paid) ? paid : 0;

  const extension: FhirExtensionInput[] = [];
  if (header.payer !== null) {
    extension.push({ url: "urn:aspen-os:payer", valueString: header.payer });
  }
  if (header.pricelist_id !== null) {
    extension.push({ url: "urn:aspen-os:pricelist", valueString: header.pricelist_id });
  }

  return {
    chargeItems: toFhirChargeItemSet(header, lines),
    invoice: {
      amountPaid: { currency, value: amountPaid },
      balance: { currency, value: totalGross - amountPaid },
      date: header.created_at.toISOString(),
      encounter: header.encounter_id === null ? null : `Encounter/${header.encounter_id}`,
      extension,
      id: header.id,
      identifier: header.invoice_no,
      resourceType: "Invoice",
      status: INVOICE_STATUS_VIEW[header.status],
      subject: `Patient/${header.patient_id}`,
      totalGross: { currency, value: totalGross },
    },
  };
}
