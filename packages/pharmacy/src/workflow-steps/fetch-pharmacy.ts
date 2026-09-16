import {
  healthcareGrn,
  healthcarePharmacyBatch,
  healthcarePharmacyItem,
  healthcarePharmacySale,
  healthcarePurchaseOrder,
  healthcareStockTransfer,
} from "#/db-schemas/pharmacy";
import type {
  HealthcareGrn,
  HealthcarePharmacyBatch,
  HealthcarePharmacyItem,
  HealthcarePharmacySale,
  HealthcarePurchaseOrder,
  HealthcareStockTransfer,
} from "#/db-schemas/pharmacy";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const ByIdSchema = object({ id: string() });

export const fetchPharmacyItemStep = WorkflowStep.name("pharmacy-fetch-pharmacy-item")
  .input(ByIdSchema)
  .handler(async (input, ctx): Promise<HealthcarePharmacyItem> => {
    const [row] = await ctx.db
      .select()
      .from(healthcarePharmacyItem)
      .where(eq(healthcarePharmacyItem.id, input.id))
      .limit(1);
    if (!row) {
      throw new Error(`Pharmacy item with id "${input.id}" not found.`);
    }
    return row;
  });

export const fetchPharmacyBatchStep = WorkflowStep.name("pharmacy-fetch-pharmacy-batch")
  .input(ByIdSchema)
  .handler(async (input, ctx): Promise<HealthcarePharmacyBatch> => {
    const [row] = await ctx.db
      .select()
      .from(healthcarePharmacyBatch)
      .where(eq(healthcarePharmacyBatch.id, input.id))
      .limit(1);
    if (!row) {
      throw new Error(`Pharmacy batch with id "${input.id}" not found.`);
    }
    return row;
  });

export const fetchPharmacySaleStep = WorkflowStep.name("pharmacy-fetch-pharmacy-sale")
  .input(ByIdSchema)
  .handler(async (input, ctx): Promise<HealthcarePharmacySale> => {
    const [row] = await ctx.db
      .select()
      .from(healthcarePharmacySale)
      .where(eq(healthcarePharmacySale.id, input.id))
      .limit(1);
    if (!row) {
      throw new Error(`Pharmacy sale with id "${input.id}" not found.`);
    }
    return row;
  });

export const fetchPurchaseOrderStep = WorkflowStep.name("pharmacy-fetch-purchase-order")
  .input(ByIdSchema)
  .handler(async (input, ctx): Promise<HealthcarePurchaseOrder> => {
    const [row] = await ctx.db
      .select()
      .from(healthcarePurchaseOrder)
      .where(eq(healthcarePurchaseOrder.id, input.id))
      .limit(1);
    if (!row) {
      throw new Error(`Purchase order with id "${input.id}" not found.`);
    }
    return row;
  });

export const fetchGrnStep = WorkflowStep.name("pharmacy-fetch-grn")
  .input(ByIdSchema)
  .handler(async (input, ctx): Promise<HealthcareGrn> => {
    const [row] = await ctx.db
      .select()
      .from(healthcareGrn)
      .where(eq(healthcareGrn.id, input.id))
      .limit(1);
    if (!row) {
      throw new Error(`GRN with id "${input.id}" not found.`);
    }
    return row;
  });

export const fetchStockTransferStep = WorkflowStep.name("pharmacy-fetch-stock-transfer")
  .input(ByIdSchema)
  .handler(async (input, ctx): Promise<HealthcareStockTransfer> => {
    const [row] = await ctx.db
      .select()
      .from(healthcareStockTransfer)
      .where(eq(healthcareStockTransfer.id, input.id))
      .limit(1);
    if (!row) {
      throw new Error(`Stock transfer with id "${input.id}" not found.`);
    }
    return row;
  });
