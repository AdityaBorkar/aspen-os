export interface Unit {
  destroy(): Promise<void>;
  readonly name: string;
  prepare?(): Promise<void>;
}

export interface Module<N extends string = string> {
  destroy(): Promise<void>;
  initialize?(units: Record<string, Unit>): void;
  readonly name: N;
  prepare?(): Promise<void>;
}
