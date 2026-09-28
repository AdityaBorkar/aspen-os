import { defineAcl } from "@aspen-os/platform/server";

export const acl = defineAcl({
  batch: ["create", "expire", "move", "read", "split", "update"],
  pickList: ["cancel", "create", "read", "submit", "update"],
  putawayRule: ["create", "disable", "read", "update"],
  reconciliation: ["cancel", "create", "read", "submit", "update"],
  reservation: ["cancel", "consume", "create", "read", "release"],
  serial: ["cancel", "create", "deliver", "expire", "read"],
  setting: ["read", "update"],
  stockEntry: ["amend", "cancel", "create", "read", "submit", "update"],
  stockLedger: ["read"],
  warehouse: ["create", "disable", "read", "update"],
  warehouseType: ["create", "disable", "read", "update"],
});
