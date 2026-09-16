import type { HealthcarePrescription } from "#/db-schemas/encounters";
import type { HealthcarePharmacySale } from "#/db-schemas/pharmacy";
import type { HealthcarePrescriptionLine } from "#/db-schemas/prescription-line";

import { boolean, is, object, optional } from "valibot";
import type { InferOutput } from "valibot";

import type { FhirExtensionInput } from "./fhir-extension";
import { CODE_SYSTEM, DISPENSE_STATUS_MAP, MEDREQ_INTENT, MEDREQ_STATUS_MAP } from "./registries";
import type { DispenseStatusCanonical, MedreqStatusCanonical } from "./registries";

export interface FhirMedicationConcept {
  code: string;
  display: string;
  system: string;
}

export interface FhirDosageInstruction {
  additionalInstruction: string[];
  text: string;
}

export interface FhirMedicationRequestView {
  authoredOn: string;
  controlled: boolean;
  dispenseQuantity: number | null;
  dosageInstruction: FhirDosageInstruction[];
  encounter: string | null;
  expectedSupplyDays: number | null;
  extension: FhirExtensionInput[];
  groupIdentifier: string;
  id: string;
  intent: string;
  medication: FhirMedicationConcept;
  performer: string | null;
  requester: string | null;
  resourceType: "MedicationRequest";
  status: MedreqStatusCanonical;
  subject: string;
  substitutionAllowed: boolean;
}

export interface FhirDispenseView {
  extension: FhirExtensionInput[];
  id: string;
  identifier: string;
  prescription: string | null;
  quantity: number | null;
  resourceType: "MedicationDispense";
  status: DispenseStatusCanonical;
  subject: string;
  whenHandedOver: string | null;
  whenPrepared: string;
}

const DISPENSE_STATUS_VIEW = {
  cancelled: DISPENSE_STATUS_MAP.CANCELLED,
  fulfilled: DISPENSE_STATUS_MAP.FULFILLED,
  partial: DISPENSE_STATUS_MAP.PARTIAL,
  pending: DISPENSE_STATUS_MAP.PENDING,
} as const;

const ControlledOverlaySchema = object({
  controlled: optional(boolean()),
});

type ControlledOverlay = InferOutput<typeof ControlledOverlaySchema>;

function readControlled(payload: HealthcarePrescriptionLine["payload"]): boolean {
  if (payload === null || payload === undefined) {
    return false;
  }
  const raw = payload.fhir;
  if (raw instanceof Date || Array.isArray(raw)) {
    return false;
  }
  if (!is(ControlledOverlaySchema, raw)) {
    return false;
  }
  const overlay: ControlledOverlay = raw;
  return overlay.controlled ?? false;
}

function mapMedreqStatus(raw: string): MedreqStatusCanonical {
  const normalized = raw.trim().toLowerCase().replace(/_/g, "-");
  if (normalized === "active") {
    return MEDREQ_STATUS_MAP.ACTIVE;
  }
  if (normalized === "on-hold" || normalized === "held") {
    return MEDREQ_STATUS_MAP.ON_HOLD;
  }
  if (normalized === "cancelled") {
    return MEDREQ_STATUS_MAP.CANCELLED;
  }
  if (normalized === "completed") {
    return MEDREQ_STATUS_MAP.COMPLETED;
  }
  if (normalized === "entered-in-error") {
    return MEDREQ_STATUS_MAP.ENTERED_IN_ERROR;
  }
  return MEDREQ_STATUS_MAP.ACTIVE;
}

function isKnownMedreqStatus(raw: string): boolean {
  const normalized = raw.trim().toLowerCase().replace(/_/g, "-");
  if (normalized === "active") {
    return true;
  }
  if (normalized === "on-hold" || normalized === "held") {
    return true;
  }
  if (normalized === "cancelled") {
    return true;
  }
  if (normalized === "completed") {
    return true;
  }
  if (normalized === "entered-in-error") {
    return true;
  }
  return false;
}

function dosageText(line: HealthcarePrescriptionLine): string {
  const parts: string[] = [];
  if (line.dose !== null && line.dose.length > 0) {
    parts.push(line.dose);
  }
  if (line.frequency !== null && line.frequency.length > 0) {
    parts.push(line.frequency);
  }
  if (line.days !== null) {
    parts.push(`${line.days} days`);
  }
  return parts.join(" ");
}

export function toFhirMedicationRequestSet(
  header: HealthcarePrescription,
  lines: HealthcarePrescriptionLine[],
): FhirMedicationRequestView[] {
  return lines.map((line) => {
    const controlled = readControlled(line.payload);
    const status = mapMedreqStatus(line.status);
    const extension: FhirExtensionInput[] = [];
    if (!isKnownMedreqStatus(line.status) && line.status.trim().length > 0) {
      extension.push({ url: "urn:aspen-os:legacy-status", valueString: line.status });
    }
    if (controlled) {
      extension.push({ url: "urn:aspen-os:controlled", valueString: "true" });
    }
    return {
      authoredOn: line.created_at.toISOString(),
      controlled,
      dispenseQuantity: null,
      dosageInstruction: [
        {
          additionalInstruction: Array.isArray(line.warnings) ? line.warnings : [],
          text: dosageText(line),
        },
      ],
      encounter:
        line.encounter_id === null
          ? `Encounter/${header.encounter_id}`
          : `Encounter/${line.encounter_id}`,
      expectedSupplyDays: line.days,
      extension,
      groupIdentifier: header.id,
      id: line.id,
      intent: MEDREQ_INTENT,
      medication: {
        code: line.drug,
        display: line.drug,
        system: CODE_SYSTEM.LOCAL,
      },
      performer: line.performer,
      requester: line.requester,
      resourceType: "MedicationRequest",
      status,
      subject: `Patient/${line.patient_id ?? header.patient_id}`,
      substitutionAllowed: line.substitution_allowed,
    };
  });
}

export function toFhirDispenseView(sale: HealthcarePharmacySale): FhirDispenseView {
  return {
    extension: [{ url: "urn:aspen-os:sale-mode", valueString: sale.mode }],
    id: sale.id,
    identifier: sale.sale_no,
    prescription:
      sale.prescription_id === null ? null : `MedicationRequest/${sale.prescription_id}`,
    quantity: null,
    resourceType: "MedicationDispense",
    status: DISPENSE_STATUS_VIEW[sale.status],
    subject: `Patient/${sale.patient_id}`,
    whenHandedOver: sale.status === "fulfilled" ? sale.updated_at.toISOString() : null,
    whenPrepared: sale.created_at.toISOString(),
  };
}
