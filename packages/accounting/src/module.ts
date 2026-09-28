import { acl } from "#/auth";
import { control_plane_schemas, tenant_schemas } from "#/db-schemas";
import { events } from "#/pubsub";
import * as wf from "#/workflows";

import type { Module, ModuleInfra } from "@aspen-os/platform/server";

export interface AccountingModuleConfig {
  baseCurrency?: string;
}

const DEFAULT_CONFIG: Required<AccountingModuleConfig> = {
  baseCurrency: "INR",
};

export class Accounting implements Module {
  static create(config?: AccountingModuleConfig): Accounting {
    return new Accounting(config ?? {});
  }

  readonly $name = "accounting";
  readonly $dependencies: readonly string[] = ["masters"];
  readonly $consumes: readonly string[] = [
    "inventory.stock_changed",
    "masters.contact_created",
    "masters.contact_updated",
    "comms.message_delivered",
  ];
  readonly $config: Required<AccountingModuleConfig>;

  constructor(config: AccountingModuleConfig) {
    this.$config = { ...DEFAULT_CONFIG, ...config };
  }

  $prepareInfra(): ModuleInfra {
    return {
      auth: { acl },
      db: { control_plane_schemas, tenant_schemas },
      events,
    };
  }

  $initialize(): void {}

  $prepareRuntime(): void {}

  $cleanup(): void {}

  readonly accounts = wf.accounts;
  readonly fiscalYears = wf.fiscalYears;
  readonly journals = wf.journals;
  readonly journalTemplates = wf.journalTemplates;
  readonly taxTemplates = wf.taxTemplates;
  readonly termsTemplates = wf.termsTemplates;
  readonly paymentTerms = wf.paymentTerms;
  readonly quotations = wf.quotations;
  readonly salesOrders = wf.salesOrders;
  readonly deliveries = wf.deliveries;
  readonly salesInvoices = wf.salesInvoices;
  readonly materialRequests = wf.materialRequests;
  readonly rfqs = wf.rfqs;
  readonly supplierQuotations = wf.supplierQuotations;
  readonly purchaseOrders = wf.purchaseOrders;
  readonly receipts = wf.receipts;
  readonly purchaseInvoices = wf.purchaseInvoices;
  readonly payments = wf.payments;
  readonly reconciliation = wf.reconciliation;
  readonly assets = wf.assets;
  readonly reports = wf.reports;
}
