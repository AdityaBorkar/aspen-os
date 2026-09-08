import { defineAcl } from "@aspen-os/platform/server";

export const acl = defineAcl({
  attendance: ["approve", "create", "read", "reject", "update"],
  overtime: ["approve", "create", "read", "reject", "update"],
  shift: ["approve", "create", "read", "reject", "update"],
});
