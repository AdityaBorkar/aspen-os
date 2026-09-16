import type { NewHealthcareObservation } from "#/db-schemas/observation";
import { CODE_SYSTEM, UCUM_UNIT } from "#/fhir/registries";

// Canonical dual-write helpers (HEALTHCARE-SPEC §§5, 6, 8, 11, dual-write phase).
//
// Consistency choice: legacy + canonical rows are written inside one
// ctx.db.transaction per workflow step (legacy first, canonical second).
// Any failure rolls both back, so reads never observe a half-absorbed
// write. Reads stay on legacy tables until cutover; canonical rows carry
// payload.fhir.absorbed_from { table, id } for audit replay and parity
// counts. Post-sign edits keep flowing through encounter_addendum —
// writers below never bypass fetchOpenEncounterStep.

// Fixed observation profile/source per workflow (HEALTHCARE-SPEC §6).
export const OBS_PROFILE_ENCOUNTER_INTAKE = "encounter-intake";
export const OBS_PROFILE_TRIAGE = "triage";
export const OBS_PROFILE_BEDSIDE = "bedside";
export const OBS_PROFILE_LABORATORY = "laboratory";

// LOINC component codes: one observation row per component keeps LOINC 1:1.
export const LOINC_SYSTOLIC = "8480-6";
export const LOINC_DIASTOLIC = "8462-4";
export const LOINC_HEART_RATE = "8867-4";
export const LOINC_RESP_RATE = "9279-1";
export const LOINC_SPO2 = "2708-6";
export const LOINC_BODY_TEMP = "8310-5";
export const LOINC_BODY_WEIGHT = "29463-7";
export const LOINC_PAIN_SCORE = "72514-3";
export const LOCAL_EWS_TOTAL = "ews-total";

export interface BpReading {
  diastolic: number;
  systolic: number;
}

// Parses encounter "120/80" text into components. Returns null when the
// text is not a numeric pair; callers preserve the raw text in
// payload.fhir so no bp remainder goes unrecorded.
export function parseBpText(bp: string): BpReading | null {
  const parts = bp.split("/");
  const [sysText, diaText] = parts;
  if (parts.length !== 2 || sysText === undefined || diaText === undefined) {
    return null;
  }
  const systolic = Number(sysText.trim());
  const diastolic = Number(diaText.trim());
  if (!Number.isFinite(systolic) || !Number.isFinite(diastolic)) {
    return null;
  }
  if (systolic <= 0 || diastolic <= 0) {
    return null;
  }
  return { diastolic, systolic };
}

// Legacy diagnosis kind (provisional/confirmed) normalizes 1:1 to the
// canonical verification axis; an explicit canonical alias wins.
export function diagnosisVerificationFromKind(
  kind: string,
  verificationStatus: string | undefined,
): string {
  if (verificationStatus !== undefined) {
    return verificationStatus;
  }
  switch (kind) {
    case "confirmed": {
      return "confirmed";
    }
    default: {
      return "provisional";
    }
  }
}

// Encounter ledger (open/signed, the pgEnum truth) projects to canonical
// in-progress/finished for reads. Unknown literals pass through unchanged.
export function normalizeEncounterFhirStatus(status: string): string {
  switch (status) {
    case "open":
    case "in-progress": {
      return "in-progress";
    }
    case "signed":
    case "finished": {
      return "finished";
    }
    default: {
      return status;
    }
  }
}

// Appointment ledger projects to canonical Appointment.status
// (HEALTHCARE-SPEC §3.2). Reschedules keep the ledger row with a
// reschedule link; the canonical projection of rescheduled is booked.
export function normalizeAppointmentFhirStatus(status: string): string {
  switch (status) {
    case "confirmed":
    case "rescheduled": {
      return "booked";
    }
    case "checked-in":
    case "in-queue":
    case "in-consult": {
      return "arrived";
    }
    case "done": {
      return "fulfilled";
    }
    case "no-show": {
      return "noshow";
    }
    default: {
      return status;
    }
  }
}

// Canonical appointment filter values collapse onto the closest ledger
// literal for the enum-typed status column. arrived is a representative
// (checked-in stands for the arrived family); proposed/pending have no
// ledger equivalent and pass through, matching nothing — the same as any
// unknown filter string today.
export function appointmentLedgerStatus(filterStatus: string): string {
  switch (filterStatus) {
    case "fulfilled": {
      return "done";
    }
    case "noshow": {
      return "no-show";
    }
    case "arrived": {
      return "checked-in";
    }
    default: {
      return filterStatus;
    }
  }
}

// Invoice ledger projects through the forward INVOICE_STATUS_MAP
// (draft→draft, final→issued, partial/paid→balanced). Money truth stays
// in paid/total; fhir_status is the projection only.
export function normalizeInvoiceFhirStatus(ledgerStatus: string): string {
  switch (ledgerStatus) {
    case "draft": {
      return "draft";
    }
    case "final": {
      return "issued";
    }
    case "partial":
    case "paid": {
      return "balanced";
    }
    default: {
      return ledgerStatus;
    }
  }
}

// Canonical invoice filter values collapse onto the ledger before column
// comparison. balanced is a representative (paid stands for the balanced
// family); cancelled/entered-in-error have no ledger equivalent yet and
// pass through, matching nothing until a void flow writes them.
export function invoiceLedgerStatus(aliasStatus: string): string {
  switch (aliasStatus) {
    case "issued": {
      return "final";
    }
    case "balanced": {
      return "paid";
    }
    default: {
      return aliasStatus;
    }
  }
}

// Lab flag projects to the interpretation subset (HEALTHCARE-SPEC §3.2).
export function labInterpretationFromFlag(flag: string): string {
  switch (flag) {
    case "L": {
      return "L";
    }
    case "H": {
      return "H";
    }
    case "critical": {
      return "AA";
    }
    default: {
      return "N";
    }
  }
}

// Lab result version 1 is final; later versions amend (HEALTHCARE-SPEC §3.2).
export function labStatusForVersion(version: number): string {
  if (version > 1) {
    return "amended";
  }
  return "final";
}

interface ObservationBase {
  absorbedId: string;
  absorbedTable: string;
  branchId: string;
  encounterId: string | null;
  note: string | null;
  patientId: string;
  performerId: string | null;
  profile: string;
  source: string;
}

interface ObservationMeasure {
  code: string;
  codeSystem: string;
  legacyBp: string | null;
  unit: string | null;
  valueNumber: string | null;
  valueText: string | null;
}

function absorbedPayload(absorbedTable: string, absorbedId: string, legacyBp: string | null) {
  if (legacyBp === null) {
    return { fhir: { absorbed_from: { id: absorbedId, table: absorbedTable } } };
  }
  return {
    fhir: { absorbed_from: { id: absorbedId, table: absorbedTable }, legacy_bp: legacyBp },
  };
}

function makeObservation(
  base: ObservationBase,
  measure: ObservationMeasure,
): NewHealthcareObservation {
  return {
    branch_id: base.branchId,
    code: measure.code,
    code_system: measure.codeSystem,
    effective_at: new Date(),
    encounter_id: base.encounterId,
    id: crypto.randomUUID(),
    interpretation: null,
    method: null,
    note: base.note,
    patient_id: base.patientId,
    payload: absorbedPayload(base.absorbedTable, base.absorbedId, measure.legacyBp),
    performer_id: base.performerId,
    profile: base.profile,
    reference_high: null,
    reference_low: null,
    source: base.source,
    status: "final",
    unit: measure.unit,
    value_coding: null,
    value_number: measure.valueNumber,
    value_system: null,
    value_text: measure.valueText,
  };
}

export interface VitalsObservationSource {
  absorbedId: string;
  absorbedTable: string;
  bpDia: number | null | undefined;
  bpSys: number | null | undefined;
  bpText: string | null | undefined;
  branchId: string;
  encounterId: string | null;
  ews: number | null | undefined;
  note: string | null | undefined;
  painScore: number | null | undefined;
  patientId: string;
  performerId: string | null;
  profile: string;
  pulse: number | null | undefined;
  rr: number | null | undefined;
  source: string;
  spo2: number | null | undefined;
  tempC: number | null | undefined;
  weightKg: number | null | undefined;
}

export interface VitalsObservationBuild {
  rows: NewHealthcareObservation[];
  unparsedBp: string | null;
}

// Expands one legacy vitals-shaped write into one observation row per
// non-null component. Explicit systolic/diastolic numerics win; otherwise
// bp text parses to components with the raw preserved. Unparseable bp
// text yields no component row and is reported for legacy preservation.
export function buildVitalsObservationRows(
  source: VitalsObservationSource,
): VitalsObservationBuild {
  const base: ObservationBase = {
    absorbedId: source.absorbedId,
    absorbedTable: source.absorbedTable,
    branchId: source.branchId,
    encounterId: source.encounterId,
    note: source.note ?? null,
    patientId: source.patientId,
    performerId: source.performerId,
    profile: source.profile,
    source: source.source,
  };
  const rows: NewHealthcareObservation[] = [];
  let unparsedBp: string | null = null;
  let systolic = source.bpSys ?? null;
  let diastolic = source.bpDia ?? null;
  const rawBp = source.bpText ?? null;
  if ((systolic === null || diastolic === null) && rawBp !== null) {
    const parsed = parseBpText(rawBp);
    if (parsed === null) {
      unparsedBp = rawBp;
    } else {
      const { diastolic: parsedDiastolic, systolic: parsedSystolic } = parsed;
      systolic ??= parsedSystolic;
      diastolic ??= parsedDiastolic;
    }
  }
  if (systolic !== null) {
    rows.push(
      makeObservation(base, {
        code: LOINC_SYSTOLIC,
        codeSystem: CODE_SYSTEM.LOINC,
        legacyBp: rawBp,
        unit: UCUM_UNIT.MM_HG,
        valueNumber: String(systolic),
        valueText: null,
      }),
    );
  }
  if (diastolic !== null) {
    rows.push(
      makeObservation(base, {
        code: LOINC_DIASTOLIC,
        codeSystem: CODE_SYSTEM.LOINC,
        legacyBp: null,
        unit: UCUM_UNIT.MM_HG,
        valueNumber: String(diastolic),
        valueText: null,
      }),
    );
  }
  const pulse = source.pulse ?? null;
  if (pulse !== null) {
    rows.push(
      makeObservation(base, {
        code: LOINC_HEART_RATE,
        codeSystem: CODE_SYSTEM.LOINC,
        legacyBp: null,
        unit: UCUM_UNIT.BPM,
        valueNumber: String(pulse),
        valueText: null,
      }),
    );
  }
  const rr = source.rr ?? null;
  if (rr !== null) {
    rows.push(
      makeObservation(base, {
        code: LOINC_RESP_RATE,
        codeSystem: CODE_SYSTEM.LOINC,
        legacyBp: null,
        unit: "/min",
        valueNumber: String(rr),
        valueText: null,
      }),
    );
  }
  const spo2 = source.spo2 ?? null;
  if (spo2 !== null) {
    rows.push(
      makeObservation(base, {
        code: LOINC_SPO2,
        codeSystem: CODE_SYSTEM.LOINC,
        legacyBp: null,
        unit: UCUM_UNIT.PERCENT,
        valueNumber: String(spo2),
        valueText: null,
      }),
    );
  }
  const tempC = source.tempC ?? null;
  if (tempC !== null) {
    rows.push(
      makeObservation(base, {
        code: LOINC_BODY_TEMP,
        codeSystem: CODE_SYSTEM.LOINC,
        legacyBp: null,
        unit: UCUM_UNIT.DEG_C,
        valueNumber: String(tempC),
        valueText: null,
      }),
    );
  }
  const weightKg = source.weightKg ?? null;
  if (weightKg !== null) {
    rows.push(
      makeObservation(base, {
        code: LOINC_BODY_WEIGHT,
        codeSystem: CODE_SYSTEM.LOINC,
        legacyBp: null,
        unit: UCUM_UNIT.KG,
        valueNumber: String(weightKg),
        valueText: null,
      }),
    );
  }
  const painScore = source.painScore ?? null;
  if (painScore !== null) {
    rows.push(
      makeObservation(base, {
        code: LOINC_PAIN_SCORE,
        codeSystem: CODE_SYSTEM.LOINC,
        legacyBp: null,
        unit: UCUM_UNIT.SCORE,
        valueNumber: String(painScore),
        valueText: null,
      }),
    );
  }
  const ews = source.ews ?? null;
  if (ews !== null) {
    rows.push(
      makeObservation(base, {
        code: LOCAL_EWS_TOTAL,
        codeSystem: CODE_SYSTEM.LOCAL,
        legacyBp: null,
        unit: UCUM_UNIT.SCORE,
        valueNumber: String(ews),
        valueText: null,
      }),
    );
  }
  return { rows, unparsedBp };
}

export interface LabObservationSource {
  absorbedId: string;
  branchId: string;
  encounterId: string | null;
  id?: string;
  interpretation: string;
  numericValue: number | null;
  patientId: string;
  performerId: string | null;
  refHigh: string | null;
  refLow: string | null;
  status: string;
  testCode: string;
  valueText: string;
}

// Projects one legacy lab result into a laboratory observation row
// (test_code→code, numeric text→value_number else value_text,
// flag→interpretation, master refs snapshotted). Lab units resolve through
// masters UOM in a later phase; numeric rows carry unit_pending in
// payload.fhir until then.
export function buildLabObservationRow(source: LabObservationSource): NewHealthcareObservation {
  const numeric = source.numericValue !== null;
  return {
    branch_id: source.branchId,
    code: source.testCode,
    code_system: CODE_SYSTEM.LOCAL,
    effective_at: new Date(),
    encounter_id: source.encounterId,
    // Callers may pin the id up front (e.g. result-enter for its event
    // hint); otherwise a fresh UUID keeps the previous behavior.
    id: source.id ?? crypto.randomUUID(),
    interpretation: source.interpretation,
    method: null,
    note: null,
    patient_id: source.patientId,
    payload: {
      fhir: {
        absorbed_from: { id: source.absorbedId, table: "healthcare_lab_result" },
        unit_pending: numeric,
      },
    },
    performer_id: source.performerId,
    profile: OBS_PROFILE_LABORATORY,
    reference_high: source.refHigh,
    reference_low: source.refLow,
    source: OBS_PROFILE_LABORATORY,
    status: source.status,
    unit: null,
    value_coding: null,
    value_number: numeric ? String(source.numericValue) : null,
    value_system: null,
    value_text: numeric ? null : source.valueText,
  };
}
