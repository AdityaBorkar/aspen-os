import { accountingPaymentReference } from "#/db-schemas/payment";
import { accountingPurchaseInvoice } from "#/db-schemas/purchase";
import { accountingSalesInvoice } from "#/db-schemas/sales";
import { GL_TOLERANCE, parseMoney, roundMoney, toMoney } from "#/utils/money";
import type { Db } from "#/workflows/db";

import { eq } from "drizzle-orm";

export interface AllocationRequest {
  allocatedAmount: number;
  referenceId: string;
  referenceType: string;
}

export interface AllocationValidation {
  outstanding: number;
  partyId: string;
  referenceId: string;
  referenceType: string;
}

export interface ValidateAllocationsInput {
  allocations: AllocationRequest[];
  db: Db;
  partyId?: string | null;
}

function assertPositiveAllocation(amount: number): void {
  if (!(amount > 0)) {
    throw new Error("Allocated amounts must be positive.");
  }
}

function assertReferenceType(referenceType: string): void {
  if (referenceType !== "Sales Invoice" && referenceType !== "Purchase Invoice") {
    throw new Error(`Unsupported reference type "${referenceType}".`);
  }
}

export async function validateAllocationTargets(
  input: ValidateAllocationsInput,
): Promise<AllocationValidation[]> {
  const { allocations, db, partyId } = input;
  const validated: AllocationValidation[] = [];
  for (const allocation of allocations) {
    assertPositiveAllocation(allocation.allocatedAmount);
    assertReferenceType(allocation.referenceType);
    if (allocation.referenceType === "Sales Invoice") {
      const [invoice] = await db
        .select({
          customer_id: accountingSalesInvoice.customer_id,
          outstanding_amount: accountingSalesInvoice.outstanding_amount,
        })
        .from(accountingSalesInvoice)
        .where(eq(accountingSalesInvoice.id, allocation.referenceId))
        .limit(1);
      if (!invoice) {
        throw new Error(`Sales invoice "${allocation.referenceId}" not found.`);
      }
      if (partyId && invoice.customer_id !== partyId) {
        throw new Error("One payment entry settles one party only.");
      }
      const outstanding = parseMoney(invoice.outstanding_amount);
      if (allocation.allocatedAmount - outstanding > GL_TOLERANCE) {
        throw new Error(`Allocation exceeds outstanding for invoice "${allocation.referenceId}".`);
      }
      validated.push({
        outstanding,
        partyId: invoice.customer_id,
        referenceId: allocation.referenceId,
        referenceType: allocation.referenceType,
      });
    } else {
      const [invoice] = await db
        .select({
          on_hold: accountingPurchaseInvoice.on_hold,
          outstanding_amount: accountingPurchaseInvoice.outstanding_amount,
          supplier_id: accountingPurchaseInvoice.supplier_id,
        })
        .from(accountingPurchaseInvoice)
        .where(eq(accountingPurchaseInvoice.id, allocation.referenceId))
        .limit(1);
      if (!invoice) {
        throw new Error(`Purchase invoice "${allocation.referenceId}" not found.`);
      }
      if (invoice.on_hold) {
        throw new Error(
          `Purchase invoice "${allocation.referenceId}" is on hold and excluded from payment.`,
        );
      }
      if (partyId && invoice.supplier_id !== partyId) {
        throw new Error("One payment entry settles one party only.");
      }
      const outstanding = parseMoney(invoice.outstanding_amount);
      if (allocation.allocatedAmount - outstanding > GL_TOLERANCE) {
        throw new Error(`Allocation exceeds outstanding for invoice "${allocation.referenceId}".`);
      }
      validated.push({
        outstanding,
        partyId: invoice.supplier_id,
        referenceId: allocation.referenceId,
        referenceType: allocation.referenceType,
      });
    }
  }
  return validated;
}

export interface ApplyAllocationsInput {
  allocations: AllocationRequest[];
  db: Db;
  paymentId: string;
}

export interface ApplyAllocationsResult {
  paidPurchases: string[];
  paidSales: string[];
  totalAllocated: number;
}

export async function insertAllocationReferences(input: ApplyAllocationsInput): Promise<void> {
  const { allocations, db, paymentId } = input;
  if (allocations.length === 0) {
    return;
  }
  await db.insert(accountingPaymentReference).values(
    allocations.map((allocation) => ({
      allocated_amount: toMoney(allocation.allocatedAmount),
      payment_id: paymentId,
      reference_id: allocation.referenceId,
      reference_type: allocation.referenceType,
    })),
  );
}

export async function applyAllocationsToInvoices(
  input: ApplyAllocationsInput,
): Promise<ApplyAllocationsResult> {
  const { allocations, db, paymentId } = input;
  void paymentId;
  const paidSales: string[] = [];
  const paidPurchases: string[] = [];
  let totalAllocated = 0;
  for (const allocation of allocations) {
    assertPositiveAllocation(allocation.allocatedAmount);
    assertReferenceType(allocation.referenceType);
    totalAllocated = roundMoney(totalAllocated + allocation.allocatedAmount);
    if (allocation.referenceType === "Sales Invoice") {
      const [invoice] = await db
        .select()
        .from(accountingSalesInvoice)
        .where(eq(accountingSalesInvoice.id, allocation.referenceId))
        .limit(1);
      if (!invoice) {
        throw new Error(`Sales invoice "${allocation.referenceId}" not found.`);
      }
      const outstanding = roundMoney(
        parseMoney(invoice.outstanding_amount) - allocation.allocatedAmount,
      );
      if (allocation.allocatedAmount - parseMoney(invoice.outstanding_amount) > GL_TOLERANCE) {
        throw new Error(`Allocation exceeds outstanding for invoice "${allocation.referenceId}".`);
      }
      const allocated = roundMoney(
        parseMoney(invoice.allocated_amount) + allocation.allocatedAmount,
      );
      let { status } = invoice;
      if (outstanding <= GL_TOLERANCE) {
        status = "paid";
        paidSales.push(invoice.id);
      } else if (allocated > GL_TOLERANCE) {
        status = "partly_paid";
      }
      await db
        .update(accountingSalesInvoice)
        .set({
          allocated_amount: toMoney(allocated),
          outstanding_amount: toMoney(Math.max(0, outstanding)),
          status,
          updated_at: new Date(),
        })
        .where(eq(accountingSalesInvoice.id, invoice.id));
    } else {
      const [invoice] = await db
        .select()
        .from(accountingPurchaseInvoice)
        .where(eq(accountingPurchaseInvoice.id, allocation.referenceId))
        .limit(1);
      if (!invoice) {
        throw new Error(`Purchase invoice "${allocation.referenceId}" not found.`);
      }
      const outstanding = roundMoney(
        parseMoney(invoice.outstanding_amount) - allocation.allocatedAmount,
      );
      if (allocation.allocatedAmount - parseMoney(invoice.outstanding_amount) > GL_TOLERANCE) {
        throw new Error(`Allocation exceeds outstanding for invoice "${allocation.referenceId}".`);
      }
      const allocated = roundMoney(
        parseMoney(invoice.allocated_amount) + allocation.allocatedAmount,
      );
      let { status } = invoice;
      if (outstanding <= GL_TOLERANCE) {
        status = "paid";
        paidPurchases.push(invoice.id);
      } else if (allocated > GL_TOLERANCE) {
        status = "partly_paid";
      }
      await db
        .update(accountingPurchaseInvoice)
        .set({
          allocated_amount: toMoney(allocated),
          outstanding_amount: toMoney(Math.max(0, outstanding)),
          status,
          updated_at: new Date(),
        })
        .where(eq(accountingPurchaseInvoice.id, invoice.id));
    }
  }
  return { paidPurchases, paidSales, totalAllocated };
}
