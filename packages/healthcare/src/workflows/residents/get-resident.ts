import { ResidentIdSchema } from "#/schemas/residents";
import { fetchResidentStep } from "#/workflow-steps/fetch-resident";

import { Workflow } from "@aspen-os/platform/server";
import { is, object, parse, string } from "valibot";

const GetResidentInputSchema = object({ input: ResidentIdSchema });

export const getResident = Workflow.name("healthcare.residents.get-resident")
  .input(GetResidentInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ResidentIdSchema, input);
    const row = await ctx.step.run(fetchResidentStep, { id: parsed.id });
    const { payload } = row;
    return {
      address: row.address,
      advance: Number(row.advance),
      age: row.age,
      alerts: Array.isArray(payload.alerts) ? payload.alerts : [],
      bedId: row.bed_id,
      deliveries: Array.isArray(payload.deliveries) ? payload.deliveries : [],
      feedback: Array.isArray(payload.feedback) ? payload.feedback : [],
      history: is(string(), payload.history) ? payload.history : null,
      id: row.id,
      idNumber: is(string(), payload.idNumber) ? payload.idNumber : null,
      name: row.name,
      nokName: row.nok_name,
      nokPhone: row.nok_phone,
      payerName: is(string(), payload.payerName) ? payload.payerName : null,
      payerPhone: is(string(), payload.payerPhone) ? payload.payerPhone : null,
      phone: row.phone,
      roomType: row.room_type,
      sex: row.sex,
      status: row.status,
      stayType: is(string(), payload.stayType) ? payload.stayType : "long-stay",
      uhid: row.uhid,
    };
  });
