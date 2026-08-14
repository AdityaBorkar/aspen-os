export interface Unit<Config> {
  readonly $config: Config;
  readonly $name: string;
}

export interface Module<TName extends string = string> {
  readonly $name: TName;
}
