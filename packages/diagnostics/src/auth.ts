import { defineAcl } from "@aspen-os/platform/server";

export const acl = defineAcl({
  diagnostics: ["authorize", "create", "delete", "read", "update"],
});
