import { FILE_EVENTS } from "#/pubsub";
import { appendVersion } from "#/services/version-service";
import { IdSchema, NewVersionSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchFileStep } from "#/workflow-steps/fetch-file";

import { Workflow } from "@aspen-os/platform/server";
import { is, object, parse, string } from "valibot";

const NewVersionInputSchema = object({
  fileId: IdSchema,
  input: NewVersionSchema,
});

export const newFileVersion = Workflow.name("dms.version.new")
  .input(NewVersionInputSchema)
  .handler(async ({ fileId, input }, ctx) => {
    const parsed = parse(NewVersionSchema, input);
    const file = await ctx.step.run(fetchFileStep, { id: fileId });

    if (file.status === "trashed") {
      throw new Error(`File "${fileId}" is trashed and cannot accept new versions.`);
    }
    if (file.status === "triaged") {
      throw new Error(
        `File "${fileId}" is triaged and has exactly one version. Classify it first.`,
      );
    }

    const { body } = parsed;
    if (!(body instanceof Buffer) && !(body instanceof ReadableStream) && !is(string(), body)) {
      throw new Error("Invalid file body: expected a string, Buffer, or ReadableStream.");
    }

    const actorId = ctx.actorId ?? parsed.uploadedBy ?? file.ownerId;

    const { newVersion, updated } = await ctx.step.run("append-version", async () =>
      appendVersion(ctx.db, file, {
        actorId,
        body,
        contentType: parsed.contentType ?? undefined,
        name: parsed.name ?? undefined,
        uploadedBy: actorId,
      }),
    );

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.VERSION_ADDED,
        crudAction: "create",
        entityId: fileId,
        entityType: AUDIT_ENTITY_TYPE.FILE,
        metadata: { version: newVersion },
        newState: { name: updated.name, size: updated.size, version: newVersion },
        previousState: { name: file.name, size: file.size, version: file.version },
      });

      await ctx.pubsub.publish(FILE_EVENTS.VERSION_ADDED, {
        fileId,
        version: newVersion,
      });
    });

    return updated;
  });
