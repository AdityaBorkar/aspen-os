import { pageSchema } from "fumadocs-core/source/schema";
import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import { z } from "zod";

const docs = {
  postprocess: { includeProcessedMarkdown: true },
  schema: pageSchema.extend({
    display: z.string().optional(),
  }),
};

function definePackageDocs(dir: string) {
  return defineDocs({ dir: `../packages/${dir}/docs`, docs });
}

export const platform = definePackageDocs("platform");
export const compliance = definePackageDocs("compliance");
export const hrCore = definePackageDocs("hr-core");
export const hrAttendance = definePackageDocs("hr-attendance");
export const hrLeave = definePackageDocs("hr-leave");
export const dms = definePackageDocs("dms");
export const constants = definePackageDocs("constants");
export const comms = definePackageDocs("comms");
export const tasks = definePackageDocs("tasks");
export const management = definePackageDocs("management");
export const masters = definePackageDocs("masters");
export const crm = definePackageDocs("crm");
export const fleet = definePackageDocs("fleet");
export const inventory = definePackageDocs("inventory");
export const reports = definePackageDocs("reports");
export const workspace = definePackageDocs("workspace");
export const notes = definePackageDocs("notes");
export const calendar = definePackageDocs("calendar");

export default defineConfig();
