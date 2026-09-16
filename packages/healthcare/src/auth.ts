import { defineAcl } from "@aspen-os/platform/server";

export const acl = defineAcl({
  appointment: ["create", "delete", "read", "update"],
  billing: ["create", "delete", "discount-approve", "read", "update"],
  branch: ["create", "delete", "read", "update"],
  encounter: ["create", "delete", "read", "update"],
  facility: ["create", "delete", "read", "update"],
  operations: ["create", "delete", "read", "update"],
  patient: ["create", "delete", "read", "update"],
  practitioner: ["create", "delete", "read", "update"],
  records: ["create", "delete", "read", "update"],
  service: ["create", "delete", "read", "update"],
});
