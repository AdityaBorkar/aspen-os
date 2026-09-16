export const NOTES_OWNERSHIP = "notes.note" as const;

export interface ClinicalNoteIntent {
  branchId: string;
  encounterId?: string | null;
  healthcareNoteId: string;
  patientId: string;
}

export interface ClinicalNoteScope {
  scopeId: string;
  scopeType: string;
}

export function clinicalNoteScope(patientId: string): ClinicalNoteScope {
  return { scopeId: patientId, scopeType: "patient" };
}
