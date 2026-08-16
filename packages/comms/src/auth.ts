import { defineAcl } from "@aspen-os/platform/server";

export const acl = defineAcl({
  channel: [
    "activate",
    "create",
    "deactivate",
    "delete",
    "read",
    "rotateCredential",
    "setDefault",
    "test",
    "update",
  ],
  message: ["read", "update"],
  notification: ["create", "read", "update", "delete"],
  preference: ["read", "update"],
  provider: ["activate", "create", "deactivate", "read", "update"],
  setting: ["read", "update"],
  template: ["activate", "create", "deactivate", "read", "update"],
});
