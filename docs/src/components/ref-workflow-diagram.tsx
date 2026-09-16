import { Background, Controls, MiniMap, Position, ReactFlow } from "@xyflow/react";
import type { Edge, Node, XYPosition } from "@xyflow/react";
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import type { ChangeEvent } from "react";

export interface WorkflowDiagramEntry {
  exportName: string | null;
  file: string;
  name: string;
  package: string;
}

interface HierarchyGroup {
  childPaths: string[];
  depth: number;
  id: string;
  label: string;
  leafIds: string[];
  parentId: string | null;
}

interface FlowElements {
  edges: Edge[];
  groupCount: number;
  leafCount: number;
  nodes: Node[];
}

const X_GAP = 300;
const Y_GAP = 110;

const ROOT_NODE_STYLE = {
  background: "var(--color-fd-primary, #14b8a6)",
  borderRadius: 8,
  color: "var(--color-fd-primary-foreground, #ffffff)",
  fontWeight: 700,
  padding: 10,
  width: 200,
};

const GROUP_NODE_STYLE = {
  background: "var(--color-fd-muted, #f4f4f5)",
  borderRadius: 8,
  color: "var(--color-fd-foreground, #09090b)",
  fontWeight: 600,
  padding: 10,
  width: 200,
};

const LEAF_NODE_STYLE = {
  background: "var(--color-fd-card, #ffffff)",
  border: "1px solid var(--color-fd-border, #e4e4e7)",
  borderRadius: 8,
  color: "var(--color-fd-foreground, #09090b)",
  fontSize: 12,
  padding: 8,
  width: 200,
};

function groupNodeId(packageName: string, groupPath: string): string {
  return groupPath === "" ? `module:${packageName}` : `group:${packageName}:${groupPath}`;
}

function toPoint(xCoord: number, yCoord: number): XYPosition {
  // oxlint-disable-next-line id-length -- React Flow XYPosition requires x/y keys.
  return { x: xCoord, y: yCoord };
}

function subscribeToMounted(): () => void {
  return unsubscribeMounted;
}

function unsubscribeMounted(): void {
  // Snapshot never changes after hydration; nothing to clean up.
}

function snapshotMounted(): boolean {
  return true;
}

function snapshotServerMounted(): boolean {
  return false;
}

export function buildFlowElements(
  packageName: string,
  entries: WorkflowDiagramEntry[],
): FlowElements {
  const groups = new Map<string, HierarchyGroup>();
  const leafParents = new Map<string, string>();
  const leafLabels = new Map<string, string>();

  const ensureGroup = (groupPath: string): HierarchyGroup => {
    const existing = groups.get(groupPath);
    if (existing) {
      return existing;
    }
    const segments = groupPath === "" ? [] : groupPath.split(".");
    const parentPath = segments.length <= 1 ? "" : segments.slice(0, -1).join(".");
    const group: HierarchyGroup = {
      childPaths: [],
      depth: segments.length,
      id: groupNodeId(packageName, groupPath),
      label: groupPath === "" ? packageName : (segments.at(-1) ?? groupPath),
      leafIds: [],
      parentId: groupPath === "" ? null : groupNodeId(packageName, parentPath),
    };
    groups.set(groupPath, group);
    if (groupPath !== "") {
      ensureGroup(parentPath).childPaths.push(groupPath);
    }
    return group;
  };

  ensureGroup("");

  for (const entry of entries) {
    const parentPath = entry.name.split(".").slice(0, -1).join(".");
    const leafId = `workflow:${packageName}:${entry.name}`;
    ensureGroup(parentPath).leafIds.push(leafId);
    leafParents.set(leafId, parentPath);
    leafLabels.set(leafId, entry.name);
  }

  const descendantCounts = new Map<string, number>();
  const deepestFirst = [...groups].toSorted(([, left], [, right]) => right.depth - left.depth);
  for (const [groupPath, group] of deepestFirst) {
    let total = group.leafIds.length;
    for (const childPath of group.childPaths) {
      total += descendantCounts.get(childPath) ?? 0;
    }
    descendantCounts.set(groupPath, total);
  }

  const positions = new Map<string, XYPosition>();
  let cursor = 0;
  const layoutGroup = (groupPath: string): number => {
    const group = groups.get(groupPath);
    if (!group) {
      return cursor * Y_GAP;
    }
    const centers: number[] = [];
    for (const childPath of [...group.childPaths].toSorted()) {
      centers.push(layoutGroup(childPath));
    }
    for (const leafId of [...group.leafIds].toSorted()) {
      const leafY = cursor * Y_GAP;
      positions.set(leafId, toPoint((group.depth + 1) * X_GAP, leafY));
      centers.push(leafY);
      cursor += 1;
    }
    const first = centers.at(0) ?? cursor * Y_GAP;
    const last = centers.at(-1) ?? cursor * Y_GAP;
    const center = (first + last) / 2;
    positions.set(group.id, toPoint(group.depth * X_GAP, center));
    return center;
  };
  layoutGroup("");

  const nodes: Node[] = [];
  for (const [groupPath, group] of groups) {
    const isRoot = groupPath === "";
    const count = descendantCounts.get(groupPath) ?? 0;
    nodes.push({
      data: { label: `${group.label} (${count})` },
      id: group.id,
      position: positions.get(group.id) ?? toPoint(0, 0),
      sourcePosition: Position.Right,
      style: isRoot ? ROOT_NODE_STYLE : GROUP_NODE_STYLE,
      targetPosition: Position.Left,
    });
  }
  for (const leafId of leafParents.keys()) {
    nodes.push({
      data: { label: leafLabels.get(leafId) ?? leafId },
      id: leafId,
      position: positions.get(leafId) ?? toPoint(0, 0),
      sourcePosition: Position.Right,
      style: LEAF_NODE_STYLE,
      targetPosition: Position.Left,
    });
  }

  const edges: Edge[] = [];
  for (const group of groups.values()) {
    if (group.parentId !== null) {
      edges.push({
        id: `edge:${group.parentId}:${group.id}`,
        source: group.parentId,
        target: group.id,
        type: "smoothstep",
      });
    }
  }
  for (const [leafId, parentPath] of leafParents) {
    const parent = groups.get(parentPath);
    if (parent) {
      edges.push({
        id: `edge:${parent.id}:${leafId}`,
        source: parent.id,
        target: leafId,
        type: "smoothstep",
      });
    }
  }

  return { edges, groupCount: groups.size - 1, leafCount: entries.length, nodes };
}

export function WorkflowDiagram({ workflows }: { workflows: WorkflowDiagramEntry[] }) {
  const packageOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const workflow of workflows) {
      counts.set(workflow.package, (counts.get(workflow.package) ?? 0) + 1);
    }
    return [...counts]
      .map(([packageName, count]) => ({ count, packageName }))
      .toSorted((left, right) => left.packageName.localeCompare(right.packageName));
  }, [workflows]);

  const [selectedPackage, setSelectedPackage] = useState("");
  const mounted = useSyncExternalStore(subscribeToMounted, snapshotMounted, snapshotServerMounted);

  const activePackage = packageOptions.some((option) => option.packageName === selectedPackage)
    ? selectedPackage
    : (packageOptions.at(0)?.packageName ?? "");

  const elements = useMemo(() => {
    const entries = workflows
      .filter((workflow) => workflow.package === activePackage)
      .toSorted((left, right) => left.name.localeCompare(right.name));
    return buildFlowElements(activePackage, entries);
  }, [workflows, activePackage]);

  const handlePackageChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedPackage(event.currentTarget.value);
  }, []);

  if (packageOptions.length === 0) {
    return <p className="text-sm text-fd-muted-foreground">No workflows found.</p>;
  }

  return (
    <section aria-label="Workflow hierarchy diagram">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium" htmlFor="workflow-diagram-module">
          Module
        </label>
        <select
          className="rounded-md border bg-fd-card px-2 py-1.5 text-sm"
          id="workflow-diagram-module"
          onChange={handlePackageChange}
          value={activePackage}
        >
          {packageOptions.map((option) => (
            <option key={option.packageName} value={option.packageName}>
              {option.packageName} ({option.count})
            </option>
          ))}
        </select>
        <span className="text-sm text-fd-muted-foreground">
          {elements.leafCount} workflows · {elements.groupCount} groups
        </span>
      </div>
      <div className="h-[70vh] w-full overflow-hidden rounded-lg border">
        {mounted ? (
          <ReactFlow
            colorMode="system"
            defaultEdges={elements.edges}
            defaultNodes={elements.nodes}
            fitView
            key={activePackage}
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-fd-muted-foreground">
            Loading diagram…
          </div>
        )}
      </div>
    </section>
  );
}
