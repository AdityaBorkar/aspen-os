import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { dmsFile } from "../db-schemas";
import { WithFileIdSchema } from "./item-utils";

const getItemFileById = Workflow.name("dms.file.get-by-id")
  .input(WithFileIdSchema)
  .handler(async ({ id }, ctx) => {
    const [file] = await ctx.db
      .select()
      .from(dmsFile)
      .where(eq(dmsFile.id, id))
      .limit(1);

    if (!file) {
      throw new Error(`File with id "${id}" not found.`);
    }

    return file;
  });

export const getItemFile = getItemFileById;
export { getItemFileById };
