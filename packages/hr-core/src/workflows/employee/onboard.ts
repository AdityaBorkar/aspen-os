import { OnboardEmployeeSchema } from "#/types";
import { createOnboarding } from "#/workflows/transition/onboarding/create";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { create as createEmployee } from "./create";
import { createSkillMap } from "./skill-map/create";

const InputSchema = object({
  input: OnboardEmployeeSchema,
});

/**
 * Single-submit employee onboarding.
 *
 * Orchestrates the downstream workflows in order:
 * 1. `hr.employee.create` — the employee record (uniqueness checks included).
 * 2. `hr.employee.create-skill-map` — once per pre-entered skill; failures are
 *    collected instead of failing the run so the employee still lands.
 * 3. `hr.transition.create-onboarding` — opens the onboarding transition that
 *    tracks this hire to completion.
 */
export const onboard = Workflow.name("hr.employee.onboard")
  .input(InputSchema)
  .handler(async ({ input }) => {
    const created = await createEmployee.run({ input: input.employee });
    if (!created) {
      throw new Error("Employee creation returned no record.");
    }

    const skills = input.skills ?? [];
    const skillResults = await Promise.allSettled(
      skills.map((skill) =>
        createSkillMap.run({
          input: { ...skill, employeeId: created.id },
        }),
      ),
    );
    // skillResults[i] corresponds to skills[i]; a rejection means that skill
    // failed to map and is reported back for retry from the detail page.
    const failedSkills = skills
      .filter((skill, index) => skillResults[index]?.status === "rejected")
      .map((skill) => skill.skill);

    const onboarding = await createOnboarding.run({
      input: {
        employeeId: created.id,
        notes: input.onboarding?.notes ?? null,
      },
    });
    if (!onboarding) {
      throw new Error("Onboarding creation returned no record.");
    }

    return { employee: created, failedSkills, onboarding };
  });
