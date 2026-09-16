import { githubFileUrl, slugify } from "#/lib/paths";
import type {
  DbSchemaRow,
  EventRow,
  ModuleRow,
  SchemaRow,
  WorkflowRow,
  WorkflowStepRow,
} from "#/lib/ref";
import { joinOrDash, orDash } from "#/lib/ref";

import type { ReactNode } from "react";

export interface Column<Row> {
  cellClass?: string;
  header: string;
  render: (row: Row) => ReactNode;
}

export function TableWrapper({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto rounded-lg border">{children}</div>;
}

export function GitHubLink({ file }: { file: string }) {
  return (
    <a className="underline" href={githubFileUrl(file)} rel="noreferrer" target="_blank">
      {file}
    </a>
  );
}

export function Anchor({ id, children }: { children: ReactNode; id: string }) {
  return (
    <a className="underline decoration-dotted" href={`#${id}`}>
      {children}
    </a>
  );
}

export function DataTable<Row>({
  columns,
  getAnchor,
  getKey,
  rows,
}: {
  columns: Column<Row>[];
  getAnchor: (row: Row) => string;
  getKey: (row: Row) => string;
  rows: Row[];
}) {
  return (
    <TableWrapper>
      <table className="w-full text-sm">
        <thead className="bg-fd-muted/50 text-left">
          <tr>
            {columns.map((column) => (
              <th className="px-3 py-2" key={column.header}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className="border-t" id={getAnchor(row)} key={getKey(row)}>
              {columns.map((column) => (
                <td className={`px-3 py-2 font-mono ${column.cellClass ?? ""}`} key={column.header}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrapper>
  );
}

export const MODULE_COLUMNS: Column<ModuleRow>[] = [
  {
    header: "Module ($name)",
    render: (row) => <Anchor id={slugify(row.name)}>{row.name}</Anchor>,
  },
  { cellClass: "text-xs", header: "Package", render: (row) => row.package },
  { cellClass: "text-xs", header: "File", render: (row) => <GitHubLink file={row.file} /> },
  { cellClass: "text-xs", header: "Dependencies", render: (row) => joinOrDash(row.dependencies) },
  { cellClass: "text-xs", header: "Consumes", render: (row) => joinOrDash(row.consumes) },
];

export const SCHEMA_COLUMNS: Column<SchemaRow>[] = [
  {
    header: "Schema",
    render: (row) => <Anchor id={slugify(`${row.package}-${row.name}`)}>{row.name}</Anchor>,
  },
  { cellClass: "text-xs", header: "Package", render: (row) => row.package },
  { cellClass: "text-xs", header: "File", render: (row) => <GitHubLink file={row.file} /> },
];

export const DB_SCHEMA_COLUMNS: Column<DbSchemaRow>[] = [
  {
    header: "Table / Enum",
    render: (row) => <Anchor id={slugify(row.tableName)}>{row.tableName}</Anchor>,
  },
  { cellClass: "text-xs", header: "Variable", render: (row) => row.name },
  { cellClass: "text-xs", header: "Kind", render: (row) => row.kind },
  { cellClass: "text-xs", header: "Package", render: (row) => row.package },
  { cellClass: "text-xs", header: "File", render: (row) => <GitHubLink file={row.file} /> },
];

export const WORKFLOW_COLUMNS: Column<WorkflowRow>[] = [
  {
    header: "Workflow",
    render: (row) => <Anchor id={slugify(row.name)}>{row.name}</Anchor>,
  },
  { cellClass: "text-xs", header: "Package", render: (row) => row.package },
  { cellClass: "text-xs", header: "Export", render: (row) => orDash(row.exportName ?? "") },
  { cellClass: "text-xs", header: "File", render: (row) => <GitHubLink file={row.file} /> },
];

export const WORKFLOW_STEP_COLUMNS: Column<WorkflowStepRow>[] = [
  {
    header: "Step",
    render: (row) => <Anchor id={slugify(row.name)}>{row.name}</Anchor>,
  },
  { cellClass: "text-xs", header: "Package", render: (row) => row.package },
  { cellClass: "text-xs", header: "Export", render: (row) => orDash(row.exportName ?? "") },
  { cellClass: "text-xs", header: "File", render: (row) => <GitHubLink file={row.file} /> },
];

export const EVENT_COLUMNS: Column<EventRow>[] = [
  {
    header: "Topic",
    render: (row) => <Anchor id={slugify(row.topic)}>{row.topic}</Anchor>,
  },
  { cellClass: "text-xs", header: "Package", render: (row) => row.package },
  { cellClass: "text-xs", header: "Constant", render: (row) => row.constant },
  { cellClass: "text-xs", header: "File", render: (row) => <GitHubLink file={row.file} /> },
];
