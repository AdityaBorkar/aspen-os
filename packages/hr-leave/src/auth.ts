import { defineAcl } from "@aspen-os/platform/server";

export const acl = defineAcl({
  leave: ["approve", "create", "read", "reject", "update"],
});
