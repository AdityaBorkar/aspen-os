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
  file: ["create", "delete", "download", "read", "update"],
  folder: ["create", "delete", "read", "update"],
  itemShare: ["create", "delete", "read", "update"],
  label: ["create", "delete", "read", "update"],
  legalHold: ["create", "read"],
  pin: ["create", "delete", "read"],
  publicLink: ["create", "delete", "read", "update"],
  setting: ["read", "update"],
  share: ["create", "delete", "read", "update"],
  view: ["create", "delete", "pin", "read", "set_default", "update"],
});
