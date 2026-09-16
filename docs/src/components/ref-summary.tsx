import { GitHubLink } from "#/components/ref-tables";
import type { ModuleSummary, RefData } from "#/lib/ref";
import {
  buildModuleSummaries,
  getDbKey,
  getEventKey,
  getModuleAnchor,
  getModuleKey,
  getSchemaKey,
  getWorkflowKey,
  getWorkflowStepKey,
  groupWorkflowsByPrefix,
} from "#/lib/ref";

import { useCallback, useMemo, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";

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

export function SummaryView({ data }: { data: RefData }) {
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
