import type { Module, ModuleInfra } from "@aspen-os/platform/server";

import { acl } from "./auth";
import { control_plane_schemas, tenant_schemas } from "./db-schemas";
import { events } from "./pubsub";
import { createAddress } from "./workflows/address/create";
import { deleteAddress } from "./workflows/address/delete";
import { getAddress } from "./workflows/address/get";
import { listAddresses } from "./workflows/address/list";
import { setPrimary as setPrimaryAddress } from "./workflows/address/primary/set";
import { updateAddress } from "./workflows/address/update";
import { activateBankAccount } from "./workflows/bank-account/activate";
import { createBankAccount } from "./workflows/bank-account/create";
import { deactivateBankAccount } from "./workflows/bank-account/deactivate";
import { deleteBankAccount } from "./workflows/bank-account/delete";
import { getBankAccount } from "./workflows/bank-account/get";
import { listBankAccounts } from "./workflows/bank-account/list";
import { setPrimary as setPrimaryBankAccount } from "./workflows/bank-account/primary/set";
import { updateBankAccount } from "./workflows/bank-account/update";
import { activateBranch } from "./workflows/branch/activate";
import { archiveBranch } from "./workflows/branch/archive";
import { closeBranch } from "./workflows/branch/close";
import { createBranch } from "./workflows/branch/create";
import { deactivateBranch } from "./workflows/branch/deactivate";
import { getBranch } from "./workflows/branch/get";
import { listBranches } from "./workflows/branch/list";
import { restoreBranch } from "./workflows/branch/restore";
import { getBranchTree } from "./workflows/branch/tree";
import { updateBranch } from "./workflows/branch/update";
import { archiveConnection } from "./workflows/connection/archive";
import { createContact } from "./workflows/connection/contact/create";
import { deleteContact } from "./workflows/connection/contact/delete";
import { updateContact } from "./workflows/connection/contact/update";
import { listContacts } from "./workflows/connection/contacts/list";
import { searchContacts } from "./workflows/connection/contacts/search";
import { createConnection } from "./workflows/connection/create";
import { getConnection } from "./workflows/connection/get";
import { listConnections } from "./workflows/connection/list";
import { addNote } from "./workflows/connection/note/add";
import { listNotes } from "./workflows/connection/notes/list";
import { setPrimaryContact } from "./workflows/connection/primary-contact/set";
import { restoreConnection } from "./workflows/connection/restore";
import { searchConnections } from "./workflows/connection/search";
import { updateStatus } from "./workflows/connection/status/update";
import { updateConnection } from "./workflows/connection/update";
import { updateBranding } from "./workflows/org/branding/update";
import { createOrganization } from "./workflows/org/create";
import { getOrganization } from "./workflows/org/get";
import { deleteLogo } from "./workflows/org/logo/delete";
import { uploadLogo } from "./workflows/org/logo/upload";
import { updateOrganization } from "./workflows/org/update";

export type OrganizationConfig = {
  country: "INDIA";
};

export class Organization implements Module {
  static create(config: OrganizationConfig): Organization {
    return new Organization(config);
  }

  readonly $name = "organization";
  readonly $dependencies = [] as const;
  readonly $config: OrganizationConfig;

  constructor(config: OrganizationConfig) {
    this.$config = config;
  }

  $prepareInfra(): ModuleInfra {
    return {
      auth: { acl },
      db: { control_plane_schemas, tenant_schemas },
      events,
    };
  }

  $initialize() {}

  $prepareRuntime() {}

  $cleanup() {}

  readonly addresses = {
    create: createAddress,
    delete: deleteAddress,
    get: getAddress,
    list: listAddresses,
    setPrimary: setPrimaryAddress,
    update: updateAddress,
  };

  readonly bankAccounts = {
    activate: activateBankAccount,
    create: createBankAccount,
    deactivate: deactivateBankAccount,
    delete: deleteBankAccount,
    get: getBankAccount,
    list: listBankAccounts,
    setPrimary: setPrimaryBankAccount,
    update: updateBankAccount,
  };

  readonly branches = {
    activate: activateBranch,
    archive: archiveBranch,
    close: closeBranch,
    create: createBranch,
    deactivate: deactivateBranch,
    get: getBranch,
    list: listBranches,
    restore: restoreBranch,
    tree: getBranchTree,
    update: updateBranch,
  };

  readonly connections = {
    addNote,
    archive: archiveConnection,
    create: createConnection,
    createContact,
    deleteContact,
    get: getConnection,
    list: listConnections,
    listContacts,
    listNotes,
    restore: restoreConnection,
    search: searchConnections,
    searchContacts,
    setPrimaryContact,
    update: updateConnection,
    updateContact,
    updateStatus,
  };

  readonly organizations = {
    create: createOrganization,
    deleteLogo,
    get: getOrganization,
    update: updateOrganization,
    updateBranding,
    uploadLogo,
  };
}
