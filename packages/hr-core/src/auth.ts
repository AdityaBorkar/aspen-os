import { defineAcl } from "@aspen-os/platform/server";

export const acl = defineAcl({
  config: ["create", "delete", "read", "update"],
  employee: ["create", "delete", "read", "update"],
  hrPermission: ["create", "delete", "read", "update"],
  hrRole: ["create", "delete", "read", "update"],
  hrUser: ["create", "delete", "read", "update"],
  lifecycle: ["approve", "create", "read", "reject", "update"],
  position: ["create", "delete", "read", "update"],
});
