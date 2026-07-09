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

export type OrganizationModuleConfig = {
  country: "INDIA";
};

export class OrganizationModule {
  static create(config: OrganizationModuleConfig): OrganizationModule {
    return new OrganizationModule(config);
  }

  constructor(private config: OrganizationModuleConfig) {}

  readonly db_schema = dbSchema;
  readonly name = "organization";

  #addresses: AddressWorkflow | null = null;
  #bankAccounts: BankAccountWorkflow | null = null;
  #branches: BranchWorkflow | null = null;
  #compliance: ComplianceWorkflow | null = null;
  #connections: ConnectionWorkflow | null = null;
  #organization: OrganizationWorkflow | null = null;

  get addresses(): AddressWorkflow {
    console.log(this.config);
    if (!this.#addresses) throw notInitialized();
    return this.#addresses;
  }

  get bankAccounts(): BankAccountWorkflow {
    if (!this.#bankAccounts) throw notInitialized();
    return this.#bankAccounts;
  }

  get branches(): BranchWorkflow {
    if (!this.#branches) throw notInitialized();
    return this.#branches;
  }

  get compliance(): ComplianceWorkflow {
    if (!this.#compliance) throw notInitialized();
    return this.#compliance;
  }

  get connections(): ConnectionWorkflow {
    if (!this.#connections) throw notInitialized();
    return this.#connections;
  }

  get organization(): OrganizationWorkflow {
    if (!this.#organization) throw notInitialized();
    return this.#organization;
  }

  initialize(units: { db: DatabaseUnit; pubsub: PubSubUnit }): void {
    this.#addresses = new AddressWorkflow(units.db.db);
    this.#bankAccounts = new BankAccountWorkflow(units.db.db);
    this.#branches = new BranchWorkflow(units.db.db);
    this.#compliance = new ComplianceWorkflow(units.db.db, units.pubsub);
    this.#connections = new ConnectionWorkflow(units.db.db);
    this.#organization = new OrganizationWorkflow(units.db.db);
  }

  async destroy(): Promise<void> {
    this.#addresses = null;
    this.#bankAccounts = null;
    this.#branches = null;
    this.#compliance = null;
    this.#connections = null;
    this.#organization = null;
  }
}

function notInitialized(): Error {
  return new Error(
    "Organization module not initialized. Call initialize(db) after framework.initialize().",
  );
}
