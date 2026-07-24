export interface Unit<Config> {
  readonly $config: Config;
  readonly $name: string;
}

export interface Module<N extends string = string> {
  readonly $name: N;
}
