import { defineAcl } from "@aspen-os/platform/server";

export const acl = defineAcl({
  class: ["archive", "create", "read", "update"],
  classField: ["create", "deactivate", "read", "update"],
  contact: ["create", "delete", "read", "update"],
  file: ["classify", "create", "delete", "download", "read", "restore", "update"],
  fileView: ["create", "delete", "read", "set_default", "update"],
  folder: ["create", "delete", "read", "update"],
  label: ["create", "delete", "read", "update"],
  legalHold: ["create", "read"],
  publicLink: ["create", "delete", "read", "update"],
  setting: ["read", "update"],
  share: ["create", "delete", "read", "update"],
});
