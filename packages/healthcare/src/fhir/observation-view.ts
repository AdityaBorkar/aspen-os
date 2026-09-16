import type { HealthcareObservation } from "#/db-schemas/observation";

import type { FhirExtensionInput } from "./fhir-extension";
import {
  CODE_SYSTEM,
  OBSERVATION_INTERPRETATION_MAP,
  OBSERVATION_STATUS_MAP,
  UCUM_UNIT,
} from "./registries";
import type { ObservationInterpretationCanonical, ObservationStatusCanonical } from "./registries";

export interface FhirObservationCoding {
  code: string;
  display: string | null;
  system: string;
}

export interface FhirObservationValue {
  code: string | null;
  display: string | null;
  system: string | null;
  text: string | null;
  unit: string | null;
  value: number | null;
}

export interface FhirObservationRange {
  high: { unit: string | null; value: number | null } | null;
  low: { unit: string | null; value: number | null } | null;
}

export interface FhirObservationView {
  category: FhirObservationCoding[];
  code: FhirObservationCoding;
  effectiveDateTime: string;
  encounter: string | null;
  extension: FhirExtensionInput[];
  id: string;
  interpretation: ObservationInterpretationCanonical | null;
  note: string | null;
  performer: string[];
  referenceRange: FhirObservationRange[];
  resourceType: "Observation";
  status: ObservationStatusCanonical;
  subject: string;
  value: FhirObservationValue;
}

const OBSERVATION_STATUS_VIEW = {
  amended: OBSERVATION_STATUS_MAP.AMENDED,
  authorized: OBSERVATION_STATUS_MAP.AUTHORIZED,
  cancelled: OBSERVATION_STATUS_MAP.CANCELLED,
  corrected: OBSERVATION_STATUS_MAP.CORRECTED,
  draft: OBSERVATION_STATUS_MAP.DRAFT,
  "entered-in-error": OBSERVATION_STATUS_MAP.ENTERED_IN_ERROR,
  final: OBSERVATION_STATUS_MAP.FINAL,
  preliminary: OBSERVATION_STATUS_MAP.PRELIMINARY,
  registered: OBSERVATION_STATUS_MAP.REGISTERED,
} as const;

const VITALS_PANEL = {
  bp_dia: { display: "Diastolic blood pressure", loinc: "8462-4", unit: UCUM_UNIT.MM_HG },
  bp_dys: { display: "Diastolic blood pressure", loinc: "8462-4", unit: UCUM_UNIT.MM_HG },
  bp_sys: { display: "Systolic blood pressure", loinc: "8480-6", unit: UCUM_UNIT.MM_HG },
  hr: { display: "Heart rate", loinc: "8867-4", unit: UCUM_UNIT.BPM },
  pain: { display: "Pain severity score", loinc: "72514-3", unit: UCUM_UNIT.SCORE },
  pulse: { display: "Heart rate", loinc: "8867-4", unit: UCUM_UNIT.BPM },
  spo2: { display: "Oxygen saturation", loinc: "2708-6", unit: UCUM_UNIT.PERCENT },
  temp: { display: "Body temperature", loinc: "8310-5", unit: UCUM_UNIT.DEG_C },
  temp_c: { display: "Body temperature", loinc: "8310-5", unit: UCUM_UNIT.DEG_C },
  weight: { display: "Body weight", loinc: "29463-7", unit: UCUM_UNIT.KG },
  weight_kg: { display: "Body weight", loinc: "29463-7", unit: UCUM_UNIT.KG },
} as const;

interface VitalsPanelEntry {
  display: string;
  loinc: string;
  unit: string;
}

function panelEntry(code: string): VitalsPanelEntry | null {
  if (code === "bp_sys") {
    return VITALS_PANEL.bp_sys;
  }
  if (code === "bp_dys" || code === "bp_dia") {
    return VITALS_PANEL.bp_dys;
  }
  if (code === "pulse" || code === "hr") {
    return VITALS_PANEL.pulse;
  }
  if (code === "spo2") {
    return VITALS_PANEL.spo2;
  }
  if (code === "temp" || code === "temp_c") {
    return VITALS_PANEL.temp;
  }
  if (code === "weight" || code === "weight_kg") {
    return VITALS_PANEL.weight;
  }
  if (code === "pain") {
    return VITALS_PANEL.pain;
  }
  return null;
}

function resolveCodeSystem(raw: string): string {
  if (raw === "LOINC") {
    return CODE_SYSTEM.LOINC;
  }
  if (raw === "SNOMED") {
    return CODE_SYSTEM.SNOMED;
  }
  if (raw === "ICD11") {
    return CODE_SYSTEM.ICD11;
  }
  if (raw === "TM2") {
    return CODE_SYSTEM.TM2;
  }
  if (raw === "NAMASTE") {
    return CODE_SYSTEM.NAMASTE;
  }
  return CODE_SYSTEM.LOCAL;
}

function resolveUnit(raw: string | null): string | null {
  if (raw === null) {
    return null;
  }
  const normalized = raw.trim().toLowerCase();
  if (normalized === "mmhg" || normalized === "mm[hg]") {
    return UCUM_UNIT.MM_HG;
  }
  if (normalized === "bpm" || normalized === "/min") {
    return UCUM_UNIT.BPM;
  }
  if (normalized === "%" || normalized === "percent") {
    return UCUM_UNIT.PERCENT;
  }
  if (normalized === "degc" || normalized === "cel" || normalized === "c") {
    return UCUM_UNIT.DEG_C;
  }
  if (normalized === "kg") {
    return UCUM_UNIT.KG;
  }
  if (normalized === "cm") {
    return UCUM_UNIT.CM;
  }
  if (normalized === "mg") {
    return UCUM_UNIT.MG;
  }
  if (normalized === "ml") {
    return UCUM_UNIT.ML;
  }
  if (normalized === "d" || normalized === "day" || normalized === "days") {
    return UCUM_UNIT.DAYS;
  }
  if (normalized === "{score}" || normalized === "score") {
    return UCUM_UNIT.SCORE;
  }
  return raw;
}

function mapStatus(raw: string): ObservationStatusCanonical {
  const normalized = raw.trim().toLowerCase();
  if (normalized === "registered") {
    return OBSERVATION_STATUS_VIEW.registered;
  }
  if (normalized === "preliminary" || normalized === "draft") {
    return normalized === "draft"
      ? OBSERVATION_STATUS_VIEW.draft
      : OBSERVATION_STATUS_VIEW.preliminary;
  }
  if (normalized === "authorized") {
    return OBSERVATION_STATUS_VIEW.authorized;
  }
  if (normalized === "amended") {
    return OBSERVATION_STATUS_VIEW.amended;
  }
  if (normalized === "corrected") {
    return OBSERVATION_STATUS_VIEW.corrected;
  }
  if (normalized === "cancelled") {
    return OBSERVATION_STATUS_VIEW.cancelled;
  }
  if (normalized === "entered-in-error") {
    return OBSERVATION_STATUS_VIEW["entered-in-error"];
  }
  return OBSERVATION_STATUS_VIEW.final;
}

function mapInterpretation(raw: string | null): ObservationInterpretationCanonical | null {
  if (raw === null) {
    return null;
  }
  const normalized = raw.trim().toLowerCase();
  if (normalized === "n" || normalized === "normal") {
    return OBSERVATION_INTERPRETATION_MAP.NORMAL;
  }
  if (normalized === "h" || normalized === "high") {
    return OBSERVATION_INTERPRETATION_MAP.HIGH;
  }
  if (normalized === "l" || normalized === "low") {
    return OBSERVATION_INTERPRETATION_MAP.LOW;
  }
  if (normalized === "aa") {
    return OBSERVATION_INTERPRETATION_MAP.AA;
  }
  if (normalized === "a") {
    return OBSERVATION_INTERPRETATION_MAP.A;
  }
  return null;
}

function asNumber(raw: string | null): number | null {
  if (raw === null) {
    return null;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBloodPressure(raw: string): { diastolic: number; systolic: number } | null {
  const parts = raw.split("/");
  const [systolicRaw, diastolicRaw] = parts;
  if (parts.length !== 2 || systolicRaw === undefined || diastolicRaw === undefined) {
    return null;
  }
  const systolicText = systolicRaw.trim();
  const diastolicText = diastolicRaw.trim();
  if (systolicText.length === 0 || diastolicText.length === 0) {
    return null;
  }
  const systolic = Number(systolicText);
  const diastolic = Number(diastolicText);
  if (!Number.isFinite(systolic) || !Number.isFinite(diastolic)) {
    return null;
  }
  return { diastolic, systolic };
}

interface ObservationCore {
  code: FhirObservationCoding;
  id: string;
  value: FhirObservationValue;
}

function baseView(row: HealthcareObservation, core: ObservationCore): FhirObservationView {
  const extension: FhirExtensionInput[] = [
    { url: "urn:aspen-os:observation-source", valueString: row.source },
  ];
  if (row.method !== null && row.method.length > 0) {
    extension.push({ url: "urn:aspen-os:observation-method", valueString: row.method });
  }

  const low = asNumber(row.reference_low);
  const high = asNumber(row.reference_high);
  const { unit } = core.value;
  const referenceRange: FhirObservationRange[] =
    low === null && high === null
      ? []
      : [
          {
            high: high === null ? null : { unit, value: high },
            low: low === null ? null : { unit, value: low },
          },
        ];

  return {
    category: [{ code: row.profile, display: row.profile, system: CODE_SYSTEM.LOCAL }],
    code: core.code,
    effectiveDateTime: row.effective_at.toISOString(),
    encounter: row.encounter_id === null ? null : `Encounter/${row.encounter_id}`,
    extension,
    id: core.id,
    interpretation: mapInterpretation(row.interpretation),
    note: row.note,
    performer: row.performer_id === null ? [] : [`Practitioner/${row.performer_id}`],
    referenceRange,
    resourceType: "Observation",
    status: mapStatus(row.status),
    subject: `Patient/${row.patient_id}`,
    value: core.value,
  };
}

function toSingleObservation(
  row: HealthcareObservation,
  normalizedCode: string,
): FhirObservationView {
  const panel = panelEntry(normalizedCode);
  const code: FhirObservationCoding =
    panel === null
      ? { code: row.code, display: null, system: resolveCodeSystem(row.code_system) }
      : { code: panel.loinc, display: panel.display, system: CODE_SYSTEM.LOINC };

  const numeric = asNumber(row.value_number);
  if (numeric !== null) {
    const unit = resolveUnit(row.unit) ?? (panel === null ? null : panel.unit);
    return baseView(row, {
      code,
      id: row.id,
      value: {
        code: null,
        display: null,
        system: null,
        text: null,
        unit,
        value: numeric,
      },
    });
  }
  if (row.value_text !== null) {
    return baseView(row, {
      code,
      id: row.id,
      value: {
        code: null,
        display: null,
        system: null,
        text: row.value_text,
        unit: null,
        value: null,
      },
    });
  }
  if (row.value_coding !== null) {
    return baseView(row, {
      code,
      id: row.id,
      value: {
        code: row.value_coding,
        display: null,
        system: row.value_system ?? CODE_SYSTEM.LOCAL,
        text: null,
        unit: null,
        value: null,
      },
    });
  }
  return baseView(row, {
    code,
    id: row.id,
    value: {
      code: null,
      display: null,
      system: null,
      text: null,
      unit: null,
      value: null,
    },
  });
}

function pushBloodPressure(row: HealthcareObservation, views: FhirObservationView[]): void {
  const raw = row.value_text;
  const parsed = raw === null ? null : parseBloodPressure(raw);
  if (parsed === null) {
    const fallback = toSingleObservation(row, "bp");
    fallback.code = { code: row.code, display: null, system: CODE_SYSTEM.LOCAL };
    fallback.extension.push({
      url: "urn:aspen-os:bp-raw",
      valueString: raw ?? row.code,
    });
    views.push(fallback);
    return;
  }
  const systolic = baseView(row, {
    code: {
      code: VITALS_PANEL.bp_sys.loinc,
      display: VITALS_PANEL.bp_sys.display,
      system: CODE_SYSTEM.LOINC,
    },
    id: `${row.id}-sys`,
    value: {
      code: null,
      display: null,
      system: null,
      text: null,
      unit: UCUM_UNIT.MM_HG,
      value: parsed.systolic,
    },
  });
  const diastolic = baseView(row, {
    code: {
      code: VITALS_PANEL.bp_dys.loinc,
      display: VITALS_PANEL.bp_dys.display,
      system: CODE_SYSTEM.LOINC,
    },
    id: `${row.id}-dia`,
    value: {
      code: null,
      display: null,
      system: null,
      text: null,
      unit: UCUM_UNIT.MM_HG,
      value: parsed.diastolic,
    },
  });
  systolic.extension.push({ url: "urn:aspen-os:bp-raw", valueString: raw ?? "" });
  diastolic.extension.push({ url: "urn:aspen-os:bp-raw", valueString: raw ?? "" });
  views.push(systolic, diastolic);
}

export function toFhirObservationSet(rows: HealthcareObservation[]): FhirObservationView[] {
  const views: FhirObservationView[] = [];
  for (const row of rows) {
    const normalizedCode = row.code.trim().toLowerCase();
    if (normalizedCode === "bp") {
      pushBloodPressure(row, views);
      continue;
    }
    const view = toSingleObservation(row, normalizedCode);
    if (normalizedCode === "bp_dys") {
      view.extension.push({ url: "urn:aspen-os:legacy-code", valueString: row.code });
    }
    views.push(view);
  }
  return views;
}
