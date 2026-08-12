import { defineAcl } from "@aspen-os/platform/server";

export const acl = defineAcl({
  classField: ["create", "deactivate", "read", "update"],
  contact: ["create", "delete", "read", "update"],
  document: [
    "classify",
    "create",
    "download",
    "read",
    "restore",
    "update",
    "delete",
  ],
  legalHold: ["create", "read"],
  pin: ["create", "delete", "read"],
  setting: ["read", "update"],
  share: ["create", "delete", "read", "update"],
  view: ["create", "delete", "pin", "read", "set_default", "update"],
});
