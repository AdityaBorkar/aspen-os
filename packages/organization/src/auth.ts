import { defineAcl } from "@aspen-os/platform/server";

export const acl = defineAcl({
  branch: ["activate", "archive", "close", "create", "deactivate", "read", "restore", "update"],
  organization: ["create", "read", "update", "update_branding"],
});
