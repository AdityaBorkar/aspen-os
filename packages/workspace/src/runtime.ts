import type { ViewCondition, ViewSort, WorkspaceModuleConfig } from "#/types";

export interface ViewResolverOptions {
  limit?: number;
  offset?: number;
}

export interface ViewResolverResult {
  rows: unknown[];
  total?: number;
}

export type ViewResolver = (
  conditions: ViewCondition[],
  sort: ViewSort[],
  opts: ViewResolverOptions,
) => Promise<ViewResolverResult>;

export type WorkspaceRuntimeConfig = Required<WorkspaceModuleConfig>;

let config: WorkspaceRuntimeConfig | null = null;

const viewResolvers = new Map<string, ViewResolver>();

export function setWorkspaceConfig(value: WorkspaceRuntimeConfig): void {
  config = value;
}

export function getWorkspaceConfig(): WorkspaceRuntimeConfig {
  if (!config) {
    throw new Error("Workspace config not initialized");
  }
  return config;
}

export function registerViewResolver(domain: string, resolver: ViewResolver): void {
  viewResolvers.set(domain, resolver);
}

export function getViewResolver(domain: string): ViewResolver {
  const resolver = viewResolvers.get(domain);
  if (!resolver) {
    throw new Error(`No view resolver registered for domain "${domain}"`);
  }
  return resolver;
}

export function hasViewResolver(domain: string): boolean {
  return viewResolvers.has(domain);
}
