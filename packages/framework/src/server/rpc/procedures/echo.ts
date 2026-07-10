import { z } from "zod/v4";

import { base } from "../base";

export const echo = base
  .input(
    z.object({
      message: z.string(),
    }),
  )
  .handler(async ({ input }) => {
    return { echo: input.message };
  });
