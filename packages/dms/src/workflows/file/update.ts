import { dmsFile } from "#/db-schemas";
import { FILE_EVENTS } from "#/pubsub";
import { appendVersion } from "#/services/version-service";
import { FileIdSchema, UpdateFileSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { stripUndefined } from "#/utils/strip-undefined";
import { fetchFileStep } from "#/workflow-steps/fetch-file";

import { Workflow } from "@aspen-os/platform/server";
import type { JsonValue } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { is, object, parse, string } from "valibot";

const UpdateInputSchema = object({ id: FileIdSchema, input: UpdateFileSchema });

export const updateFile = Workflow.name("dms.file.update")
  .input(UpdateInputSchema)
  .handler(async ({ id, input }, ctx) => {
    const file = await ctx.step.run(fetchFileStep, { id });
    const parsed = parse(UpdateFileSchema, input);
    const actorId = ctx.actorId ?? parsed.uploadedBy ?? file.uploaded_by;

    let current = file;
    let versionAdded = false;

    if (parsed.body !== undefined) {
      const { body } = parsed;
      if (!(body instanceof Buffer) && !(body instanceof ReadableStream) && !is(string(), body)) {
        throw new Error("Invalid file body: expected a string, Buffer, or ReadableStream.");
      }

      const result = await ctx.step.run("append-version", async () =>
        appendVersion(ctx.db, file, {
          actorId,
          body,
          contentType: parsed.contentType ?? undefined,
          name: parsed.name ?? undefined,
        }),
      );
      current = result.updated;
      versionAdded = true;
    }

    const metadataUpdates = stripUndefined({
      compression: parsed.compression,
      description: parsed.description,
      metadata: parsed.metadata,
      name: parsed.name,
    });

    if (Object.keys(metadataUpdates).length > 0) {
      const [updated] = await ctx.db
        .update(dmsFile)
        .set({ ...metadataUpdates, updated_at: new Date() })
        .where(eq(dmsFile.id, id))
        .returning();

      if (!updated) {
        throw new Error(`File "${id}" not found.`);
      }
      current = updated;
    }

    await ctx.step.run("audit-and-notify", async () => {
      // SAFETY: diff() compares JsonValue-typed state snapshots.
      // New/old values are JSON-safe and fit both the audit entry and event contracts.
      const changes = ctx.audit.diff(
        {
          compression: file.compression,
          description: file.description,
          metadata: file.metadata,
          name: file.name,
          size: file.size,
          version: file.version,
        },
        {
          compression: current.compression,
          description: current.description,
          metadata: current.metadata,
          name: current.name,
          size: current.size,
          version: current.version,
        },
      ) as Record<string, JsonValue> | undefined;

      await ctx.audit.write({
        action: versionAdded ? AUDIT_ACTION.VERSION_ADDED : AUDIT_ACTION.UPDATED,
        changes,
        crudAction: versionAdded ? "create" : "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.FILE,
        metadata: versionAdded ? { version: current.version } : undefined,
        newState: { name: current.name, size: current.size, version: current.version },
        previousState: { name: file.name, size: file.size, version: file.version },
      });

      await ctx.pubsub.publish(FILE_EVENTS.UPDATED, { changes: changes ?? {}, fileId: id });
      if (versionAdded) {
        await ctx.pubsub.publish(FILE_EVENTS.VERSION_ADDED, {
          fileId: id,
          version: current.version,
        });
      }
    });

    return current;
  });
