import { defineAcl } from "@aspen-os/platform/server";

export const acl = defineAcl({
  allopathy: ["create", "delete", "read", "update"],
  ayush: ["create", "delete", "read", "update"],
  dental: ["create", "delete", "read", "update"],
  psych: ["create", "delete", "override", "read", "update"],
  rehab: ["create", "delete", "read", "update"],
});
