import {
  productsAttribute,
  productsBarcode,
  productsBrand,
  productsItem,
  productsItemGroup,
  productsItemPrice,
  productsItemUom,
  productsManufacturer,
  productsPriceList,
  productsReorderRule,
} from "#/db-schemas";
import type { ProductsAttribute } from "#/db-schemas/attribute";
import type { ProductsBarcode } from "#/db-schemas/barcode";
import type { ProductsBrand } from "#/db-schemas/brand";
import type { ProductsItem } from "#/db-schemas/item";
import type { ProductsItemGroup } from "#/db-schemas/item-group";
import type { ProductsItemPrice } from "#/db-schemas/item-price";
import type { ProductsItemUom } from "#/db-schemas/item-uom";
import type { ProductsManufacturer } from "#/db-schemas/manufacturer";
import type { ProductsPriceList } from "#/db-schemas/price-list";
import type { ProductsReorderRule } from "#/db-schemas/reorder-rule";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { object, string } from "valibot";

export interface FetchByIdStepInput {
  idColumn: PgColumn;
  label: string;
  stepName: string;
  table: PgTable;
}

export function defineFetchByIdStep<TRow>(input: FetchByIdStepInput) {
  const { idColumn, label, stepName, table } = input;
  return WorkflowStep.name(stepName)
    .input(object({ id: string() }))
    .handler(async (stepInput, ctx) => {
      const rows = await ctx.db.select().from(table).where(eq(idColumn, stepInput.id)).limit(1);
      // SAFETY: rows come from selecting the entity's own table; callers pin TRow to that table's $inferSelect.
      const result = rows[0] as TRow | undefined;
      if (!result) {
        throw new Error(`${label} with id "${stepInput.id}" not found.`);
      }
      return result;
    });
}

export const fetchAttributeStep = defineFetchByIdStep<ProductsAttribute>({
  idColumn: productsAttribute.id,
  label: "Attribute",
  stepName: "products-fetch-attribute",
  table: productsAttribute,
});

export const fetchBarcodeStep = defineFetchByIdStep<ProductsBarcode>({
  idColumn: productsBarcode.id,
  label: "Barcode",
  stepName: "products-fetch-barcode",
  table: productsBarcode,
});

export const fetchBrandStep = defineFetchByIdStep<ProductsBrand>({
  idColumn: productsBrand.id,
  label: "Brand",
  stepName: "products-fetch-brand",
  table: productsBrand,
});

export const fetchGroupStep = defineFetchByIdStep<ProductsItemGroup>({
  idColumn: productsItemGroup.id,
  label: "Item group",
  stepName: "products-fetch-group",
  table: productsItemGroup,
});

export const fetchItemPriceStep = defineFetchByIdStep<ProductsItemPrice>({
  idColumn: productsItemPrice.id,
  label: "Item price",
  stepName: "products-fetch-item-price",
  table: productsItemPrice,
});

export const fetchItemUomStep = defineFetchByIdStep<ProductsItemUom>({
  idColumn: productsItemUom.id,
  label: "Item UOM",
  stepName: "products-fetch-item-uom",
  table: productsItemUom,
});

export const fetchItemStep = defineFetchByIdStep<ProductsItem>({
  idColumn: productsItem.id,
  label: "Item",
  stepName: "products-fetch-item",
  table: productsItem,
});

export const fetchManufacturerStep = defineFetchByIdStep<ProductsManufacturer>({
  idColumn: productsManufacturer.id,
  label: "Manufacturer",
  stepName: "products-fetch-manufacturer",
  table: productsManufacturer,
});

export const fetchPriceListStep = defineFetchByIdStep<ProductsPriceList>({
  idColumn: productsPriceList.id,
  label: "Price list",
  stepName: "products-fetch-price-list",
  table: productsPriceList,
});

export const fetchReorderRuleStep = defineFetchByIdStep<ProductsReorderRule>({
  idColumn: productsReorderRule.id,
  label: "Reorder rule",
  stepName: "products-fetch-reorder-rule",
  table: productsReorderRule,
});
