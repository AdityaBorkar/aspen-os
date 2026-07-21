export interface RpcConfig {
  prefix?: string;
}

export class RpcUnit {
  readonly $name = "rpc";

  async $prepare(): Promise<void> {
    return;
  }

  async $destroy(): Promise<void> {
    return;
  }
}
