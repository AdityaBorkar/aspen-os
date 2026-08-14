import { defineAcl } from "@aspen-os/platform/server";

export const acl = defineAcl({
  attendance: ["approve", "create", "read", "reject", "update"],
  employee: ["create", "delete", "read", "update"],
  hrPermission: ["create", "delete", "read", "update"],
  hrRole: ["create", "delete", "read", "update"],
  hrUser: ["create", "delete", "read", "update"],
  leave: ["approve", "create", "read", "reject", "update"],
  lifecycle: ["approve", "create", "read", "reject", "update"],
  overtime: ["approve", "create", "read", "reject", "update"],
  setup: ["create", "delete", "read", "update"],
  shift: ["approve", "create", "read", "reject", "update"],
});
