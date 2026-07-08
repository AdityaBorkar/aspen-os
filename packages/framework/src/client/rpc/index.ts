import type { RpcConfig } from "./types";

export type { RpcConfig } from "./types";

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
