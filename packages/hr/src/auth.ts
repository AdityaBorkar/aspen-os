import { defineAcl } from "@aspen-os/platform/server";

export const acl = defineAcl({
  announcement: ["archive", "create", "delete", "publish", "read", "update"],
  attendance: ["approve", "create", "read", "reject", "update"],
  employee: ["create", "delete", "read", "update"],
  hrPermission: ["create", "delete", "read", "update"],
  hrRole: ["create", "delete", "read", "update"],
  hrUser: ["create", "delete", "read", "update"],
  leave: ["approve", "create", "read", "reject", "update"],
  lifecycle: ["approve", "create", "read", "reject", "update"],
  overtime: ["approve", "create", "read", "reject", "update"],
  position: ["create", "delete", "read", "update"],
  setup: ["create", "delete", "read", "update"],
  shift: ["approve", "create", "read", "reject", "update"],
});
