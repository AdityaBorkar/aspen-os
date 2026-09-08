import { JsonValueSchema } from "#/schemas/json";

import { check, maxLength, object, optional, picklist, pipe, string, union } from "valibot";
import type { InferOutput } from "valibot";

const KnownFieldSchema = picklist([
  "class",
  "classField",
  "classId",
  "contentType",
  "createdAt",
  "expiryDate",
  "id",
  "label",
  "labels",
  "metadata",
  "name",
  "owner",
  "ownerId",
  "search",
  "size",
  "status",
  "updatedAt",
  "uploadedBy",
  "version",
]);

const FieldSchema = union([
  KnownFieldSchema,
  pipe(
    string(),
    maxLength(255),
    check((val) => val.length > 0, "Condition field is required"),
  ),
]);

const KnownOperatorSchema = picklist([
  "between",
  "contains",
  "dateAfter",
  "dateBefore",
  "eq",
  "gt",
  "gte",
  "in",
  "isEmpty",
  "isNotEmpty",
  "lt",
  "lte",
  "neq",
  "notContains",
  "notIn",
  "search",
]);

const OperatorSchema = union([
  KnownOperatorSchema,
  pipe(
    string(),
    maxLength(64),
    check((val) => val.length > 0, "Condition operator is required"),
  ),
]);

const DirectionSchema = union([
  picklist(["asc", "desc"]),
  pipe(
    string(),
    check((val) => val === "asc" || val === "desc", "Direction must be asc or desc"),
  ),
]);

// Condition/sort shapes shared by search. Filter view *persistence* moved to
// `@aspen-os/masters` (`p.masters.filterViews`, domain "dms:file"); this file
// keeps only the shapes that `search` options and `condition-service` validate
// against — the same `{ field, operator, value }` contract masters stores.
export const FileViewConditionSchema = object({
  field: FieldSchema,
  operator: OperatorSchema,
  value: optional(JsonValueSchema),
});

export type FileViewCondition = InferOutput<typeof FileViewConditionSchema>;

export const FileViewSortSchema = object({
  direction: DirectionSchema,
  field: FieldSchema,
});

export type FileViewSort = InferOutput<typeof FileViewSortSchema>;
