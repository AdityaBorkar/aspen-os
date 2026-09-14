import { ResidentIdSchema } from "#/schemas/residents";
import { fetchResidentStep } from "#/workflow-steps/fetch-resident";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const GetResidentInputSchema = object({ input: ResidentIdSchema });

export const getResident = Workflow.name("healthcare.residents.get-resident")
  .input(GetResidentInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ResidentIdSchema, input);
    const row = await ctx.step.run(fetchResidentStep, { id: parsed.id });
    return {
      address: row.address,
      advance: Number(row.advance),
      age: row.age,
      bedId: row.bed_id,
      id: row.id,
      name: row.name,
      nokName: row.nok_name,
      nokPhone: row.nok_phone,
      phone: row.phone,
      roomType: row.room_type,
      sex: row.sex,
      status: row.status,
      uhid: row.uhid,
    };
  });
