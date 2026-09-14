import {
  healthcareLabOrder,
  healthcareLabSample,
  healthcareLabTest,
  healthcareRadioBooking,
} from "#/db-schemas/diagnostics";
import type {
  HealthcareLabOrder,
  HealthcareLabSample,
  HealthcareLabTest,
  HealthcareRadioBooking,
} from "#/db-schemas/diagnostics";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const ByIdSchema = object({ id: string() });

export const fetchLabTestStep = WorkflowStep.name("healthcare-fetch-lab-test")
  .input(ByIdSchema)
  .handler(async (input, ctx): Promise<HealthcareLabTest> => {
    const [row] = await ctx.db
      .select()
      .from(healthcareLabTest)
      .where(eq(healthcareLabTest.id, input.id))
      .limit(1);
    if (!row) {
      throw new Error(`Lab test with id "${input.id}" not found.`);
    }
    return row;
  });

export const fetchLabOrderStep = WorkflowStep.name("healthcare-fetch-lab-order")
  .input(ByIdSchema)
  .handler(async (input, ctx): Promise<HealthcareLabOrder> => {
    const [row] = await ctx.db
      .select()
      .from(healthcareLabOrder)
      .where(eq(healthcareLabOrder.id, input.id))
      .limit(1);
    if (!row) {
      throw new Error(`Lab order with id "${input.id}" not found.`);
    }
    return row;
  });

export const fetchLabSampleStep = WorkflowStep.name("healthcare-fetch-lab-sample")
  .input(ByIdSchema)
  .handler(async (input, ctx): Promise<HealthcareLabSample> => {
    const [row] = await ctx.db
      .select()
      .from(healthcareLabSample)
      .where(eq(healthcareLabSample.id, input.id))
      .limit(1);
    if (!row) {
      throw new Error(`Lab sample with id "${input.id}" not found.`);
    }
    return row;
  });

export const fetchRadioBookingStep = WorkflowStep.name("healthcare-fetch-radio-booking")
  .input(ByIdSchema)
  .handler(async (input, ctx): Promise<HealthcareRadioBooking> => {
    const [row] = await ctx.db
      .select()
      .from(healthcareRadioBooking)
      .where(eq(healthcareRadioBooking.id, input.id))
      .limit(1);
    if (!row) {
      throw new Error(`Radiology booking with id "${input.id}" not found.`);
    }
    return row;
  });
