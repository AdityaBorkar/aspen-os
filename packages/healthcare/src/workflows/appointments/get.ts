import { AppointmentIdSchema } from "#/schemas/appointments";
import { fetchAppointmentStep, toAppointmentDto } from "#/workflow-steps/fetch-appointment";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const GetInputSchema = object({ input: AppointmentIdSchema });

export const getAppointment = Workflow.name("healthcare.appointments.get")
  .input(GetInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(AppointmentIdSchema, input);
    const row = await ctx.step.run(fetchAppointmentStep, { id: parsed.id });
    return toAppointmentDto(row);
  });
