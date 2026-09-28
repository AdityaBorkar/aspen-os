import { productsPricelistSetting, productsSetting } from "#/db-schemas";
import type { ProductsPricelistSetting } from "#/db-schemas/pricelist-setting";
import type { ProductsSetting } from "#/db-schemas/setting";

import type { WorkflowContext } from "@aspen-os/platform/server";

type Db = WorkflowContext["db"];

export async function getPricelistSettings(db: Db): Promise<ProductsPricelistSetting> {
  const [row] = await db.select().from(productsPricelistSetting).limit(1);
  if (row) {
    return row;
  }
  const [created] = await db.insert(productsPricelistSetting).values({}).returning();
  if (!created) {
    throw new Error("Failed to initialize pricelist settings.");
  }
  return created;
}

export async function getProductsSettings(db: Db): Promise<ProductsSetting> {
  const [row] = await db.select().from(productsSetting).limit(1);
  if (row) {
    return row;
  }
  const [created] = await db.insert(productsSetting).values({}).returning();
  if (!created) {
    throw new Error("Failed to initialize products settings.");
  }
  return created;
}
