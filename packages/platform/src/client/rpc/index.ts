export interface RpcConfig {
  prefix?: string;
}

export class RpcUnit {
  readonly $name = "rpc";

  async $prepareInfra(): Promise<void> {
    return;
  }

  async $cleanup(): Promise<void> {
    return;
  }
}
