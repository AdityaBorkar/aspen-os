export interface Unit {
  destroy(): Promise<void>;
  readonly name: string;
}

export interface Module {
  destroy(): Promise<void>;
  initialize?: (units: Record<string, Unit>) => void;
  readonly name: string;
}
