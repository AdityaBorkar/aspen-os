import { acl } from "#/auth";
import { control_plane_schemas, tenant_schemas } from "#/db-schemas";
import { events } from "#/pubsub";
import * as wf from "#/workflows";

import type { Module, ModuleInfra } from "@aspen-os/platform/server";

export interface ProductsModuleConfig {
  namingSeriesPrefix?: string;
}

export class Products implements Module {
  static create(config?: ProductsModuleConfig): Products {
    return new Products(config ?? {});
  }

  readonly $name = "products";
  readonly $dependencies: readonly string[] = ["masters"];
  readonly $consumes: readonly string[] = [
    "masters.unit_of_measure_created",
    "masters.unit_of_measure_updated",
    "masters.unit_of_measure_retired",
    "masters.contact_created",
    "masters.contact_updated",
    "inventory.stock_changed",
  ];
  readonly $config: ProductsModuleConfig;

  constructor(config: ProductsModuleConfig) {
    this.$config = config;
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

  readonly items = wf.items;
  readonly groups = wf.groups;
  readonly brands = wf.brands;
  readonly manufacturers = wf.manufacturers;
  readonly attributes = wf.attributes;
  readonly variants = wf.variants;
  readonly barcodes = wf.barcodes;
  readonly alternatives = wf.alternatives;
  readonly itemUoms = wf.itemUoms;
  readonly reorderRules = wf.reorderRules;
  readonly settings = wf.settings;
  readonly lookups = wf.lookups;
  readonly priceLists = wf.priceLists;
  readonly itemPrices = wf.itemPrices;
  readonly priceFetch = wf.priceFetch;
  readonly pricelistSettings = wf.pricelistSettings;
}
