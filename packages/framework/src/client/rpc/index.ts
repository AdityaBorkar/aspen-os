export interface RpcConfig {
  prefix?: string;
}

export class RpcUnit {
  readonly name = "rpc";

  constructor(config: RpcConfig = {}) {
    console.log({ config });
  }

  async prepare(): Promise<void> {
    return;
  }

  async destroy(): Promise<void> {
    return;
  }
}
