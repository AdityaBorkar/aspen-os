import { defineAcl } from "@aspen-os/platform/server";

export const acl = defineAcl({
  allopathy: ["create", "delete", "read", "update"],
  appointment: ["create", "delete", "read", "update"],
  ayush: ["create", "delete", "read", "update"],
  billing: ["create", "delete", "discount-approve", "read", "update"],
  branch: ["create", "delete", "read", "update"],
  dental: ["create", "delete", "read", "update"],
  diagnostics: ["authorize", "create", "delete", "read", "update"],
  encounter: ["create", "delete", "read", "update"],
  facility: ["create", "delete", "read", "update"],
  nursing: ["create", "delete", "read", "update"],
  operations: ["create", "delete", "read", "update"],
  patient: ["create", "delete", "read", "update"],
  pharmacy: ["create", "delete", "read", "update"],
  practitioner: ["create", "delete", "read", "update"],
  psych: ["create", "delete", "override", "read", "update"],
  records: ["create", "delete", "read", "update"],
  rehab: ["create", "delete", "read", "update"],
  resident: ["create", "delete", "read", "update"],
  service: ["create", "delete", "read", "update"],
});
