import { healthcareClinicalDocument } from "#/db-schemas/records";
import { RECORDS_EVENTS } from "#/pubsub";
import { AttachDocumentSchema } from "#/schemas/records";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const DocsAttachInputSchema = object({ input: AttachDocumentSchema });

export const docsAttach = Workflow.name("healthcare.records.docs-attach")
  .input(DocsAttachInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(AttachDocumentSchema, input);
    const branchId = parsed.branchId ?? "main";
    const allowedTypes = [
      "pdf",
      "image",
      "scan",
      "lab-report",
      "prescription",
      "discharge",
      "consent",
      "other",
    ];
    if (!allowedTypes.includes(parsed.fileType)) {
      throw new Error(
        `Unsupported file type ${parsed.fileType}; use one of ${allowedTypes.join(", ")}`,
      );
    }
    const [row] = await ctx.step.run("insert-document", async () =>
      ctx.db
        .insert(healthcareClinicalDocument)
        .values({
          branch_id: branchId,
          dms_file_id: parsed.dmsFileId,
          encounter_id: parsed.encounterId ?? null,
          file_type: parsed.fileType,
          label: parsed.label ?? null,
          patient_id: parsed.patientId,
          uploaded_by: parsed.uploadedBy,
          verified: false,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to attach document.");
    }
    // dms is the single file surface: healthcare stores clinical metadata plus
    // the dms.file id. Version/hold/share/public-link enforcement comes from
    // dms; healthcare never keeps a parallel file store.
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.RECORDS,
        newState: {
          dmsFileId: row.dms_file_id,
          fileType: row.file_type,
          patientId: row.patient_id,
        },
      });
      await ctx.pubsub.publish(RECORDS_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        data: {
          dmsFileId: row.dms_file_id,
          encounterId: row.encounter_id ?? null,
          patientId: row.patient_id,
        },
        id: row.id,
      });
    });
    return {
      dmsFileId: row.dms_file_id,
      fileType: row.file_type,
      id: row.id,
      patientId: row.patient_id,
      verified: row.verified,
    };
  });
