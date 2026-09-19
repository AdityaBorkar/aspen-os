import { defineAcl } from "@aspen-os/platform/server";

export const acl = defineAcl({
  config: ["create", "delete", "read", "update"],
  employee: ["create", "delete", "read", "update"],
  hrPermission: ["create", "delete", "read", "update"],
  hrRole: ["create", "delete", "read", "update"],
  hrUser: ["create", "delete", "read", "update"],
  payroll: ["read"],
  position: ["create", "delete", "read", "update"],
  transition: ["approve", "create", "read", "reject", "update"],
});
