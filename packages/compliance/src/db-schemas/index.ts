export {
  type ComplianceDocument,
  type ComplianceObligation,
  type ComplianceVerificationRule,
  complianceDocument,
  complianceObligation,
  complianceTables,
  complianceVerificationRule,
  type NewComplianceDocument,
  type NewComplianceObligation,
  type NewComplianceVerificationRule,
  sql,
} from "../db-schema";

import { complianceTables } from "../db-schema";

export const control_plane_schemas = {} as Record<string, unknown>;

export const tenant_schemas = complianceTables;
