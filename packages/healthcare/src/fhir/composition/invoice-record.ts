import type { FhirEncounterView } from "../encounter-view";
import type { FhirChargeItemView, FhirInvoiceView } from "../invoice-view";
import type { FhirPatientView } from "../patient-view";

export type InvoiceCompositionStatus = "amended" | "final" | "preliminary";

export interface InvoiceRecordSection {
  code: string;
  display: string;
  entries: string[];
  text: string | null;
  title: string;
}

export interface InvoiceComposition {
  author: string | null;
  date: string;
  encounter: string | null;
  id: string;
  resourceType: "Composition";
  sections: InvoiceRecordSection[];
  status: InvoiceCompositionStatus;
  subject: string;
  title: string;
  type: string;
}

export type InvoiceRecordEntry =
  | FhirChargeItemView
  | FhirEncounterView
  | FhirInvoiceView
  | FhirPatientView;

export interface InvoiceRecordInput {
  chargeItems: FhirChargeItemView[];
  encounter: FhirEncounterView | null;
  invoice: FhirInvoiceView;
  patient: FhirPatientView;
}

export interface InvoiceRecord {
  composition: InvoiceComposition;
  entries: InvoiceRecordEntry[];
}

function compositionStatus(invoice: FhirInvoiceView): InvoiceCompositionStatus {
  if (invoice.status === "draft") {
    return "preliminary";
  }
  return "final";
}

export function buildInvoiceRecord(input: InvoiceRecordInput): InvoiceRecord {
  const encounterRef =
    input.encounter === null ? input.invoice.encounter : `Encounter/${input.encounter.id}`;
  const composition: InvoiceComposition = {
    author: null,
    date: input.invoice.date,
    encounter: encounterRef,
    id: `composition-${input.invoice.id}-invoice`,
    resourceType: "Composition",
    sections: [
      {
        code: "invoice",
        display: "Invoice",
        entries: [`Invoice/${input.invoice.id}`],
        text: null,
        title: "Invoice",
      },
      {
        code: "charges",
        display: "Charge items",
        entries: input.chargeItems.map((item) => `ChargeItem/${item.id}`),
        text: null,
        title: "Charge items",
      },
    ],
    status: compositionStatus(input.invoice),
    subject: `Patient/${input.patient.id}`,
    title: "Invoice record",
    type: "InvoiceRecord",
  };
  const head: InvoiceRecordEntry[] =
    input.encounter === null ? [input.patient] : [input.patient, input.encounter];
  return {
    composition,
    entries: [...head, input.invoice, ...input.chargeItems],
  };
}
