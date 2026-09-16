import type { HealthcareBranch } from "#/db-schemas/branch";
import type { HealthcareFacility } from "#/db-schemas/facilities";

import type { FhirExtensionInput } from "./fhir-extension";
import { CODE_SYSTEM, IDENTIFIER_SYSTEM } from "./registries";

export type FhirLocationStatus = "active" | "inactive" | "suspended";

export interface FhirLocationIdentifier {
  assigner: string | null;
  system: string;
  value: string;
}

export interface FhirLocationView {
  extension: FhirExtensionInput[];
  id: string;
  identifier: FhirLocationIdentifier[];
  managingOrganization: string;
  mode: "instance";
  name: string;
  resourceType: "Location";
  status: FhirLocationStatus;
  type: string;
}

export interface OrgBranchRef {
  code: string;
  name: string | null;
}

export interface FhirOrganizationIdentifier {
  assigner: string;
  system: string;
  value: string;
}

export interface FhirOrganizationView {
  active: boolean;
  alias: string[];
  extension: FhirExtensionInput[];
  id: string;
  identifier: FhirOrganizationIdentifier[];
  name: string;
  resourceType: "Organization";
  type: string;
}

function mapLocationStatus(raw: string): FhirLocationStatus {
  const normalized = raw.trim().toLowerCase();
  if (normalized === "closed" || normalized === "inactive") {
    return "inactive";
  }
  if (normalized === "blocked" || normalized === "maintenance" || normalized === "suspended") {
    return "suspended";
  }
  return "active";
}

export function toFhirLocationView(facility: HealthcareFacility): FhirLocationView {
  const identifier: FhirLocationIdentifier[] = [
    { assigner: facility.branch_id, system: IDENTIFIER_SYSTEM.LOCAL, value: facility.id },
  ];
  if (facility.code !== null) {
    identifier.push({
      assigner: facility.branch_id,
      system: CODE_SYSTEM.LOCAL,
      value: facility.code,
    });
  }

  const extension: FhirExtensionInput[] = [];
  if (facility.occupied_at !== null) {
    extension.push({
      url: "urn:aspen-os:occupied-at",
      valueString: facility.occupied_at.toISOString(),
    });
  }
  if (facility.occupied_note !== null && facility.occupied_note.length > 0) {
    extension.push({ url: "urn:aspen-os:occupied-note", valueString: facility.occupied_note });
  }

  return {
    extension,
    id: facility.id,
    identifier,
    managingOrganization: `Organization/${facility.branch_id}`,
    mode: "instance",
    name: facility.name,
    resourceType: "Location",
    status: mapLocationStatus(facility.status),
    type: facility.category,
  };
}

export function toFhirOrganizationView(
  branch: HealthcareBranch,
  orgBranch: OrgBranchRef | null,
): FhirOrganizationView {
  const identifier: FhirOrganizationIdentifier[] = [
    { assigner: "healthcare", system: IDENTIFIER_SYSTEM.LOCAL, value: branch.subdomain },
  ];
  const branchCode = orgBranch?.code ?? branch.org_branch_code;
  if (branchCode !== null) {
    identifier.push({ assigner: "masters", system: IDENTIFIER_SYSTEM.HFR, value: branchCode });
  }

  const pricelistIds = Array.isArray(branch.pricelist_ids) ? branch.pricelist_ids : [];
  const extension: FhirExtensionInput[] = [];
  if (branch.org_branch_code !== null) {
    extension.push({
      url: "urn:aspen-os:org-branch",
      valueString: branch.org_branch_code,
    });
  }
  if (pricelistIds.length > 0) {
    extension.push({
      url: "urn:aspen-os:pricelists",
      valueString: pricelistIds.join(","),
    });
  }

  return {
    active: branch.status === "active",
    alias: [branch.subdomain],
    extension,
    id: branch.branch_id,
    identifier,
    name: orgBranch?.name ?? branch.name,
    resourceType: "Organization",
    type: branch.kind,
  };
}
