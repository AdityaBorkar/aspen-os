export interface Unit {
  destroy(): Promise<void>;
  readonly name: string;
}

export interface Module {
  destroy(): Promise<void>;
  readonly name: string;
}
