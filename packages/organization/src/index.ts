import type { DatabaseUnit, PubSubUnit } from "@aspen-os/framework/server";

import * as dbSchema from "./db-schema";
import { AddressWorkflow } from "./workflows/address";
import { BankAccountWorkflow } from "./workflows/bank-account";
import { BranchWorkflow } from "./workflows/branch";
import { ComplianceWorkflow } from "./workflows/compliance";
import { ConnectionWorkflow } from "./workflows/connection";
import { OrganizationWorkflow } from "./workflows/organization";

export type {
  AddressFilters,
  BankAccountFilters,
  BranchFilters,
  BranchTreeNode,
  BranchType,
  ComplianceCategory,
  ComplianceFilters,
  ComplianceStatus,
  ComplianceSummary,
  ConnectionFilters,
  ConnectionNoteType,
  ConnectionStatus,
  ConnectionType,
  CreateAddressInput,
  CreateBankAccountInput,
  CreateBranchInput,
  CreateComplianceDocumentInput,
  CreateConnectionContactInput,
  CreateConnectionInput,
  CreateConnectionNoteInput,
  CreateOrganizationInput,
  OrganizationStatus,
  RenewalFrequency,
  UpdateAddressInput,
  UpdateBankAccountInput,
  UpdateBranchInput,
  UpdateBrandingInput,
  UpdateComplianceDocumentInput,
  UpdateConnectionContactInput,
  UpdateConnectionInput,
  UpdateOrganizationInput,
} from "./types";
export { dbSchema };

export interface OrganizationModule {
  readonly addresses: AddressWorkflow;
  readonly bankAccounts: BankAccountWorkflow;
  readonly branches: BranchWorkflow;
  readonly compliance: ComplianceWorkflow;
  readonly connections: ConnectionWorkflow;
  readonly db_schema: typeof dbSchema;

  destroy(): Promise<void>;
  readonly name: string;
  readonly organization: OrganizationWorkflow;
}

export function createOrganizationModule(): OrganizationModule {
  let _addresses: AddressWorkflow | null = null;
  let _bankAccounts: BankAccountWorkflow | null = null;
  let _branches: BranchWorkflow | null = null;
  let _compliance: ComplianceWorkflow | null = null;
  let _connections: ConnectionWorkflow | null = null;
  let _organization: OrganizationWorkflow | null = null;

  const mod: OrganizationModule = {
    get addresses(): AddressWorkflow {
      if (!_addresses) throw notInitialized();
      return _addresses;
    },

    get bankAccounts(): BankAccountWorkflow {
      if (!_bankAccounts) throw notInitialized();
      return _bankAccounts;
    },

    get branches(): BranchWorkflow {
      if (!_branches) throw notInitialized();
      return _branches;
    },

    get compliance(): ComplianceWorkflow {
      if (!_compliance) throw notInitialized();
      return _compliance;
    },

    get connections(): ConnectionWorkflow {
      if (!_connections) throw notInitialized();
      return _connections;
    },

    db_schema: dbSchema,

    async destroy(): Promise<void> {
      _addresses = null;
      _bankAccounts = null;
      _branches = null;
      _compliance = null;
      _connections = null;
      _organization = null;
    },
    name: "organization",

    get organization(): OrganizationWorkflow {
      if (!_organization) throw notInitialized();
      return _organization;
    },
  };

  Object.defineProperty(mod, "initialize", {
    value: (units: { db: DatabaseUnit; pubsub: PubSubUnit }) => {
      _addresses = new AddressWorkflow(units.db.db);
      _bankAccounts = new BankAccountWorkflow(units.db.db);
      _branches = new BranchWorkflow(units.db.db);
      _compliance = new ComplianceWorkflow(units.db.db, units.pubsub);
      _connections = new ConnectionWorkflow(units.db.db);
      _organization = new OrganizationWorkflow(units.db.db);
    },
    writable: false,
  });

  return mod;
}

function notInitialized(): Error {
  return new Error(
    "Organization module not initialized. Call initialize(db) after framework.initialize().",
  );
}
