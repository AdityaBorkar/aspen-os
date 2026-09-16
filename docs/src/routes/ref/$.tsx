import refData from "#/../.generated/ref.json";
import { WorkflowDiagram } from "#/components/ref-workflow-diagram";
import { REF_ROUTE } from "#/lib/constants";
import { githubFileUrl, slugify, trimSlashes } from "#/lib/paths";

import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import type { ChangeEvent, ReactElement, ReactNode } from "react";

type RefData = typeof refData;
type ModuleRow = RefData["modules"][number];
type SchemaRow = RefData["schemas"][number];
type DbSchemaRow = RefData["dbSchemas"][number];
type WorkflowRow = RefData["workflows"][number];
type WorkflowStepRow = RefData["workflowSteps"][number];
// Mirrors EventEntry in scripts/generate-ref.ts. Derived as an explicit interface because
// ref.json currently contains zero events, so RefData["events"][number] collapses to never.
interface EventRow {
  constant: string;
  file: string;
  group: string;
  package: string;
  topic: string;
}

const CONTENT_TABS = [
  {
    blurb: (data: RefData) => `${data.modules.length} modules from packages/*/src/module.ts`,
    count: (data: RefData) => data.modules.length,
    label: "Modules",
    slug: "modules",
  },
  {
    blurb: (data: RefData) =>
      `${data.schemas.length} Valibot schemas from packages/*/src/schemas/**/*.ts`,
    count: (data: RefData) => data.schemas.length,
    label: "Schemas",
    slug: "schemas",
  },
  {
    blurb: (data: RefData) =>
      `${data.dbSchemas.length} Drizzle tables/enums from packages/*/src/db-schemas/**/*.ts`,
    count: (data: RefData) => data.dbSchemas.length,
    label: "DB Schemas",
    slug: "db-schemas",
  },
  {
    blurb: (data: RefData) =>
      `${data.workflows.length} Workflow.name(...) from packages/*/src/workflows/**/*.ts`,
    count: (data: RefData) => data.workflows.length,
    label: "Workflows",
    slug: "workflows",
  },
  {
    blurb: (data: RefData) =>
      `${data.workflowSteps.length} WorkflowStep.name(...) from packages/*/src/workflow-steps/**/*.ts`,
    count: (data: RefData) => data.workflowSteps.length,
    label: "Workflow Steps",
    slug: "workflow-steps",
  },
  {
    blurb: (data: RefData) => `${data.events.length} topics from packages/*/src/pubsub.ts`,
    count: (data: RefData) => data.events.length,
    label: "Events",
    slug: "events",
  },
] as const;

const TABS = [
  { label: "Overview", slug: "" },
  { label: "Summary", slug: "summary" },
  ...CONTENT_TABS,
] as const;

type TabSlug = (typeof TABS)[number]["slug"];
type ContentSlug = (typeof CONTENT_TABS)[number]["slug"];
type WorkflowView = "diagram" | "table";

const VALID_SLUGS = new Set<string>(TABS.map((entry) => entry.slug));

const DOCS_LINK_PARAMS = { _splat: "platform" } as const;
const REF_OVERVIEW_PARAMS = { _splat: "" } as const;

function isTabSlug(value: string): value is TabSlug {
  return VALID_SLUGS.has(value);
}

export const Route = createFileRoute("/ref/$")({
  component: RefPage,
  loader: ({ params }) => {
    const slug = trimSlashes(params._splat ?? ""); // oxlint-disable-line no-underscore-dangle
    if (!isTabSlug(slug)) {
      throw notFound();
    }
    return { slug };
  },
});

interface Column<Row> {
  cellClass?: string;
  header: string;
  render: (row: Row) => ReactNode;
}

function TableWrapper({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto rounded-lg border">{children}</div>;
}

function GitHubLink({ file }: { file: string }) {
  return (
    <a className="underline" href={githubFileUrl(file)} rel="noreferrer" target="_blank">
      {file}
    </a>
  );
}

function Anchor({ id, children }: { children: ReactNode; id: string }) {
  return (
    <a className="underline decoration-dotted" href={`#${id}`}>
      {children}
    </a>
  );
}

function DataTable<Row>({
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

function orDash(value: string): string {
  return value.length > 0 ? value : "—";
}

function joinOrDash(values: string[]): string {
  return values.length > 0 ? values.join(", ") : "—";
}

const MODULE_COLUMNS: Column<ModuleRow>[] = [
  {
    header: "Module ($name)",
    render: (row) => <Anchor id={slugify(row.name)}>{row.name}</Anchor>,
  },
  { cellClass: "text-xs", header: "Package", render: (row) => row.package },
  { cellClass: "text-xs", header: "File", render: (row) => <GitHubLink file={row.file} /> },
  { cellClass: "text-xs", header: "Dependencies", render: (row) => joinOrDash(row.dependencies) },
  { cellClass: "text-xs", header: "Consumes", render: (row) => joinOrDash(row.consumes) },
];

const SCHEMA_COLUMNS: Column<SchemaRow>[] = [
  {
    header: "Schema",
    render: (row) => <Anchor id={slugify(`${row.package}-${row.name}`)}>{row.name}</Anchor>,
  },
  { cellClass: "text-xs", header: "Package", render: (row) => row.package },
  { cellClass: "text-xs", header: "File", render: (row) => <GitHubLink file={row.file} /> },
];

const DB_SCHEMA_COLUMNS: Column<DbSchemaRow>[] = [
  {
    header: "Table / Enum",
    render: (row) => <Anchor id={slugify(row.tableName)}>{row.tableName}</Anchor>,
  },
  { cellClass: "text-xs", header: "Variable", render: (row) => row.name },
  { cellClass: "text-xs", header: "Kind", render: (row) => row.kind },
  { cellClass: "text-xs", header: "Package", render: (row) => row.package },
  { cellClass: "text-xs", header: "File", render: (row) => <GitHubLink file={row.file} /> },
];

const WORKFLOW_COLUMNS: Column<WorkflowRow>[] = [
  {
    header: "Workflow",
    render: (row) => <Anchor id={slugify(row.name)}>{row.name}</Anchor>,
  },
  { cellClass: "text-xs", header: "Package", render: (row) => row.package },
  { cellClass: "text-xs", header: "Export", render: (row) => orDash(row.exportName ?? "") },
  { cellClass: "text-xs", header: "File", render: (row) => <GitHubLink file={row.file} /> },
];

const WORKFLOW_STEP_COLUMNS: Column<WorkflowStepRow>[] = [
  {
    header: "Step",
    render: (row) => <Anchor id={slugify(row.name)}>{row.name}</Anchor>,
  },
  { cellClass: "text-xs", header: "Package", render: (row) => row.package },
  { cellClass: "text-xs", header: "Export", render: (row) => orDash(row.exportName ?? "") },
  { cellClass: "text-xs", header: "File", render: (row) => <GitHubLink file={row.file} /> },
];

const EVENT_COLUMNS: Column<EventRow>[] = [
  {
    header: "Topic",
    render: (row) => <Anchor id={slugify(row.topic)}>{row.topic}</Anchor>,
  },
  { cellClass: "text-xs", header: "Package", render: (row) => row.package },
  { cellClass: "text-xs", header: "Constant", render: (row) => row.constant },
  { cellClass: "text-xs", header: "File", render: (row) => <GitHubLink file={row.file} /> },
];

function getModuleAnchor(row: ModuleRow): string {
  return slugify(row.name);
}

function getModuleKey(row: ModuleRow): string {
  return `${row.package}:${row.name}`;
}

function getSchemaAnchor(row: SchemaRow): string {
  return slugify(`${row.package}-${row.name}`);
}

function getSchemaKey(row: SchemaRow): string {
  return `${row.package}:${row.name}:${row.file}`;
}

function getDbAnchor(row: DbSchemaRow): string {
  return slugify(row.tableName);
}

function getDbKey(row: DbSchemaRow): string {
  return `${row.package}:${row.tableName}:${row.name}`;
}

function getWorkflowAnchor(row: WorkflowRow): string {
  return slugify(row.name);
}

function getWorkflowKey(row: WorkflowRow): string {
  return `${row.package}:${row.name}:${row.file}`;
}

function getWorkflowStepAnchor(row: WorkflowStepRow): string {
  return slugify(row.name);
}

function getWorkflowStepKey(row: WorkflowStepRow): string {
  return `${row.package}:${row.name}:${row.file}`;
}

function getEventAnchor(row: EventRow): string {
  return slugify(row.topic);
}

function getEventKey(row: EventRow): string {
  return `${row.package}:${row.topic}`;
}

const TABLES = {
  "db-schemas": {
    render: (data) => (
      <DataTable
        columns={DB_SCHEMA_COLUMNS}
        getAnchor={getDbAnchor}
        getKey={getDbKey}
        rows={data.dbSchemas}
      />
    ),
  },
  events: {
    render: (data) => (
      <DataTable
        columns={EVENT_COLUMNS}
        getAnchor={getEventAnchor}
        getKey={getEventKey}
        rows={data.events}
      />
    ),
  },
  modules: {
    render: (data) => (
      <DataTable
        columns={MODULE_COLUMNS}
        getAnchor={getModuleAnchor}
        getKey={getModuleKey}
        rows={data.modules}
      />
    ),
  },
  schemas: {
    render: (data) => (
      <DataTable
        columns={SCHEMA_COLUMNS}
        getAnchor={getSchemaAnchor}
        getKey={getSchemaKey}
        rows={data.schemas}
      />
    ),
  },
  "workflow-steps": {
    render: (data) => (
      <DataTable
        columns={WORKFLOW_STEP_COLUMNS}
        getAnchor={getWorkflowStepAnchor}
        getKey={getWorkflowStepKey}
        rows={data.workflowSteps}
      />
    ),
  },
  workflows: {
    render: (data) => (
      <DataTable
        columns={WORKFLOW_COLUMNS}
        getAnchor={getWorkflowAnchor}
        getKey={getWorkflowKey}
        rows={data.workflows}
      />
    ),
  },
} satisfies Record<ContentSlug, { render: (data: RefData) => ReactElement }>;

function RefPage() {
  const { slug } = Route.useLoaderData();
  const [workflowView, setWorkflowView] = useState<WorkflowView>("table");
  const showWorkflowTable = useCallback(() => {
    setWorkflowView("table");
  }, []);
  const showWorkflowDiagram = useCallback(() => {
    setWorkflowView("diagram");
  }, []);
  const isDiagramFullWidth = slug === "workflows" && workflowView === "diagram";

  const content =
    slug === "" ? (
      <Overview />
    ) : slug === "summary" ? (
      <SummaryView data={refData} />
    ) : slug === "workflows" ? (
      <>
        <WorkflowViewToggle
          onDiagram={showWorkflowDiagram}
          onTable={showWorkflowTable}
          view={workflowView}
        />
        {TABLES.workflows.render(refData)}
      </>
    ) : (
      TABLES[slug].render(refData)
    );

  return (
    <div className="min-h-screen bg-fd-background text-fd-foreground">
      <header className="sticky top-0 z-20 border-b bg-fd-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link className="font-semibold" to="/">
            Aspen OS
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link
              className="text-fd-muted-foreground hover:text-fd-foreground"
              params={DOCS_LINK_PARAMS}
              to="/docs/$"
            >
              Docs
            </Link>
            <Link
              className="font-medium text-fd-foreground"
              params={REF_OVERVIEW_PARAMS}
              to="/ref/$"
            >
              Reference
            </Link>
          </nav>
        </div>
      </header>

      <div
        className={
          isDiagramFullWidth ? "mx-auto max-w-none px-4 py-6" : "mx-auto max-w-6xl px-4 py-6"
        }
      >
        {isDiagramFullWidth ? (
          <main className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <WorkflowViewToggle
                onDiagram={showWorkflowDiagram}
                onTable={showWorkflowTable}
                view={workflowView}
              />
              <p className="text-sm text-fd-muted-foreground">
                {refData.workflows.length} workflows across {refData.modules.length} modules. Pick a
                module to explore its hierarchy.
              </p>
            </div>
            <WorkflowDiagram workflows={refData.workflows} />
          </main>
        ) : (
          <div className="flex flex-col gap-6 md:flex-row">
            <aside className="w-full shrink-0 md:w-56">
              <nav
                aria-label="Reference sections"
                className="flex flex-row flex-wrap gap-1 md:flex-col"
              >
                {TABS.map((tab) => {
                  const isActive = tab.slug === slug;
                  const count = "count" in tab ? tab.count(refData) : null;
                  return (
                    <Link
                      aria-current={isActive ? "page" : undefined}
                      key={tab.slug}
                      className={
                        isActive
                          ? "flex items-center justify-between gap-2 rounded-md bg-fd-primary px-3 py-2 text-sm font-medium text-fd-primary-foreground"
                          : "flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-fd-muted-foreground hover:bg-fd-muted hover:text-fd-foreground"
                      }
                      // oxlint-disable-next-line react-perf/jsx-no-new-object-as-prop -- TanStack Router requires a per-tab params object; each tab needs its own _splat value.
                      params={{ _splat: tab.slug }}
                      to="/ref/$"
                    >
                      <span>{tab.label}</span>
                      {count !== null ? (
                        <span
                          className={
                            isActive
                              ? "rounded-full bg-fd-primary-foreground/20 px-2 py-0.5 text-xs tabular-nums"
                              : "rounded-full bg-fd-muted px-2 py-0.5 text-xs tabular-nums"
                          }
                        >
                          {count}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </nav>
            </aside>

            <main className="min-w-0 flex-1">
              <div className="mb-4 text-sm text-fd-muted-foreground">
                {refData.modules.length} modules, {refData.schemas.length} schemas,{" "}
                {refData.dbSchemas.length} db schemas, {refData.workflows.length} workflows,{" "}
                {refData.workflowSteps.length} steps, {refData.events.length} events.
                <span className="ml-2">
                  Source: generated at build time via <code>scripts/generate-ref.ts</code>
                </span>
              </div>

              {content}
            </main>
          </div>
        )}
      </div>
    </div>
  );
}

function WorkflowViewToggle({
  onDiagram,
  onTable,
  view,
}: {
  onDiagram: () => void;
  onTable: () => void;
  view: WorkflowView;
}) {
  return (
    <div
      aria-label="Workflows view"
      className="mb-4 inline-flex rounded-md border p-1"
      role="tablist"
    >
      <button
        aria-selected={view === "table"}
        className={
          view === "table"
            ? "rounded bg-fd-primary px-3 py-1 text-sm font-medium text-fd-primary-foreground"
            : "rounded px-3 py-1 text-sm text-fd-muted-foreground hover:text-fd-foreground"
        }
        onClick={onTable}
        role="tab"
        type="button"
      >
        Table View
      </button>
      <button
        aria-selected={view === "diagram"}
        className={
          view === "diagram"
            ? "rounded bg-fd-primary px-3 py-1 text-sm font-medium text-fd-primary-foreground"
            : "rounded px-3 py-1 text-sm text-fd-muted-foreground hover:text-fd-foreground"
        }
        onClick={onDiagram}
        role="tab"
        type="button"
      >
        Diagram View
      </button>
    </div>
  );
}

interface ModuleSummary {
  dbSchemas: DbSchemaRow[];
  events: EventRow[];
  module: ModuleRow;
  schemas: SchemaRow[];
  steps: WorkflowStepRow[];
  workflows: WorkflowRow[];
}

interface WorkflowGroup {
  items: WorkflowRow[];
  prefix: string;
}

function groupWorkflowsByPrefix(rows: WorkflowRow[]): WorkflowGroup[] {
  const groups = new Map<string, WorkflowRow[]>();
  for (const row of rows) {
    const dot = row.name.indexOf(".");
    const prefix = dot === -1 ? row.name : row.name.slice(0, dot);
    const existing = groups.get(prefix);
    if (existing) {
      existing.push(row);
    } else {
      groups.set(prefix, [row]);
    }
  }
  return [...groups.entries()]
    .map(([prefix, items]) => ({ items, prefix }))
    .toSorted((left, right) => left.prefix.localeCompare(right.prefix));
}

function buildModuleSummaries(data: RefData, filter: string): ModuleSummary[] {
  const needle = filter.trim().toLowerCase();
  const summaries: ModuleSummary[] = [];
  for (const module of data.modules) {
    if (needle.length > 0 && !`${module.name} ${module.package}`.toLowerCase().includes(needle)) {
      continue;
    }
    summaries.push({
      dbSchemas: data.dbSchemas.filter((row) => row.package === module.package),
      events: data.events.filter((row: EventRow) => row.package === module.package),
      module,
      schemas: data.schemas.filter((row) => row.package === module.package),
      steps: data.workflowSteps.filter((row) => row.package === module.package),
      workflows: data.workflows.filter((row) => row.package === module.package),
    });
  }
  return summaries;
}

function SummaryEmpty() {
  return <p className="font-mono text-xs text-fd-muted-foreground">—</p>;
}

function SummarySection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <details className="ml-4 rounded-md border border-dashed">
      <summary className="cursor-pointer px-3 py-2 font-mono text-xs font-medium hover:bg-fd-muted/50">
        {title}
      </summary>
      <div className="border-t px-3 py-2">{children}</div>
    </details>
  );
}

function SummaryModule({ defaultOpen, summary }: { defaultOpen: boolean; summary: ModuleSummary }) {
  const { dbSchemas, events, module, schemas, steps, workflows } = summary;
  const groups = useMemo(() => groupWorkflowsByPrefix(workflows), [workflows]);
  const total = schemas.length + dbSchemas.length + workflows.length + steps.length + events.length;

  return (
    <details className="rounded-lg border" id={getModuleAnchor(module)} open={defaultOpen}>
      <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-fd-muted/50">
        <span className="font-mono text-sm font-semibold">{module.name}</span>
        <span className="font-mono text-xs text-fd-muted-foreground">{module.package}</span>
        <span className="ml-auto font-mono text-xs text-fd-muted-foreground">
          {total} items · {schemas.length} schemas · {dbSchemas.length} db · {workflows.length}{" "}
          workflows · {steps.length} steps · {events.length} events
        </span>
      </summary>
      <div className="space-y-3 border-t px-4 py-3">
        <div className="ml-4 space-y-1 border-l pl-4 font-mono text-xs text-fd-muted-foreground">
          <GitHubLink file={module.file} />
          {module.dependencies.length > 0 ? (
            <p>depends on: {module.dependencies.join(", ")}</p>
          ) : null}
          {module.consumes.length > 0 ? <p>consumes: {module.consumes.join(", ")}</p> : null}
        </div>

        <SummarySection title={`Schemas (${schemas.length})`}>
          {schemas.length === 0 ? (
            <SummaryEmpty />
          ) : (
            <ul className="ml-4 space-y-1 border-l pl-4">
              {schemas.map((row) => (
                <li className="font-mono text-xs" key={getSchemaKey(row)}>
                  {row.name} <span className="text-fd-muted-foreground">· {row.file}</span>
                </li>
              ))}
            </ul>
          )}
        </SummarySection>

        <SummarySection title={`DB Schemas (${dbSchemas.length})`}>
          {dbSchemas.length === 0 ? (
            <SummaryEmpty />
          ) : (
            <ul className="ml-4 space-y-1 border-l pl-4">
              {dbSchemas.map((row) => (
                <li className="font-mono text-xs" key={getDbKey(row)}>
                  {row.tableName}{" "}
                  <span className="text-fd-muted-foreground">
                    · {row.kind} · {row.name} · {row.file}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SummarySection>

        <SummarySection title={`Workflows (${workflows.length})`}>
          {workflows.length === 0 ? (
            <SummaryEmpty />
          ) : (
            <div className="space-y-2">
              {groups.map((group) => (
                <div className="ml-4 border-l pl-4" key={group.prefix}>
                  <p className="font-mono text-xs font-semibold">{group.prefix}</p>
                  <ul className="ml-4 space-y-1 border-l pl-4">
                    {group.items.map((row) => (
                      <li className="font-mono text-xs" key={getWorkflowKey(row)}>
                        {row.name} <span className="text-fd-muted-foreground">· {row.file}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </SummarySection>

        <SummarySection title={`Workflow Steps (${steps.length})`}>
          {steps.length === 0 ? (
            <SummaryEmpty />
          ) : (
            <ul className="ml-4 space-y-1 border-l pl-4">
              {steps.map((row) => (
                <li className="font-mono text-xs" key={getWorkflowStepKey(row)}>
                  {row.name} <span className="text-fd-muted-foreground">· {row.file}</span>
                </li>
              ))}
            </ul>
          )}
        </SummarySection>

        <SummarySection title={`Events (${events.length})`}>
          {events.length === 0 ? (
            <SummaryEmpty />
          ) : (
            <ul className="ml-4 space-y-1 border-l pl-4">
              {events.map((row) => (
                <li className="font-mono text-xs" key={getEventKey(row)}>
                  {row.topic}{" "}
                  <span className="text-fd-muted-foreground">
                    · {row.constant} · {row.file}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SummarySection>
      </div>
    </details>
  );
}

function SummaryView({ data }: { data: RefData }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [filter, setFilter] = useState("");
  const summaries = useMemo(() => buildModuleSummaries(data, filter), [data, filter]);
  const handleFilterChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setFilter(event.currentTarget.value);
  }, []);
  const setAllOpen = useCallback((open: boolean) => {
    const root = containerRef.current;
    if (root === null) {
      return;
    }
    for (const details of root.querySelectorAll("details")) {
      details.open = open;
    }
  }, []);
  const expandAll = useCallback(() => {
    setAllOpen(true);
  }, [setAllOpen]);
  const collapseAll = useCallback(() => {
    setAllOpen(false);
  }, [setAllOpen]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          aria-label="Filter modules"
          className="rounded-md border bg-fd-card px-2 py-1.5 text-sm"
          onChange={handleFilterChange}
          placeholder="Filter modules…"
          type="search"
          value={filter}
        />
        <button
          className="rounded-md border px-3 py-1.5 text-sm text-fd-muted-foreground hover:text-fd-foreground"
          onClick={expandAll}
          type="button"
        >
          Expand all
        </button>
        <button
          className="rounded-md border px-3 py-1.5 text-sm text-fd-muted-foreground hover:text-fd-foreground"
          onClick={collapseAll}
          type="button"
        >
          Collapse all
        </button>
        <span className="text-sm text-fd-muted-foreground">
          {summaries.length} of {data.modules.length} modules
        </span>
      </div>
      <div className="space-y-3" ref={containerRef}>
        {summaries.map((summary, index) => (
          <SummaryModule
            defaultOpen={index === 0}
            key={getModuleKey(summary.module)}
            summary={summary}
          />
        ))}
        {summaries.length === 0 ? (
          <p className="text-sm text-fd-muted-foreground">No modules match “{filter}”.</p>
        ) : null}
      </div>
    </div>
  );
}

function Overview() {
  return (
    <div className="prose max-w-none prose-sm dark:prose-invert">
      <h1>Reference</h1>
      <p>
        Auto-generated from <code>packages/*</code> via <code>scripts/generate-ref.ts</code>. Pick a
        section:
      </p>
      <ul>
        <li>
          {/* oxlint-disable-next-line react-perf/jsx-no-new-object-as-prop -- TanStack Router requires a per-tab params object; each tab needs its own _splat value. */}
          <Link className="underline" params={{ _splat: "summary" }} to="/ref/$">
            Summary
          </Link>{" "}
          — all {refData.modules.length} modules grouped in one accordion with indented schemas, db
          schemas, workflows, steps, and events
        </li>
        {CONTENT_TABS.map((tab) => (
          <li key={tab.slug}>
            {/* oxlint-disable-next-line react-perf/jsx-no-new-object-as-prop -- TanStack Router requires a per-tab params object; each tab needs its own _splat value. */}
            <Link className="underline" params={{ _splat: tab.slug }} to="/ref/$">
              {tab.label}
            </Link>{" "}
            — {tab.blurb(refData)}
          </li>
        ))}
      </ul>
      <p className="text-sm text-fd-muted-foreground">
        Endpoint: <code>{`${REF_ROUTE}/*`}</code>. Each table row is anchored (e.g.{" "}
        <code>{REF_ROUTE}/workflows#task.create</code>). Data source is generated at build time
        (gitignored, verified with <code>bun run gen:ref --check</code>).
      </p>
    </div>
  );
}
