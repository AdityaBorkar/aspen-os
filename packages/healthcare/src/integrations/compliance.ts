export const COMPLIANCE_OWNERSHIP_DOCUMENT = "compliance.document" as const;

export const COMPLIANCE_OWNERSHIP_VERIFICATION = "compliance.verification" as const;

export const COMPLIANCE_OWNERSHIP_AUDIT = "compliance.audit" as const;

export type HealthcareComplianceFramework = "CEA" | "NABH" | "NABL";

export interface HealthcareComplianceIntent {
  attestedBy?: string | null;
  branchId: string;
  control: string;
  evidencePath: string;
  framework: string;
  healthcareEvidenceId: string;
}

export function complianceDocumentName(intent: HealthcareComplianceIntent): string {
  return `${intent.framework} ${intent.control}`;
}

export function complianceDocumentCategory(): "regulatory" {
  return "regulatory";
}
