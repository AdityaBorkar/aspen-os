import type { RpcConfig } from "./types";

export type { RpcConfig } from "./types";

export class RpcUnit {
  readonly name = "rpc";

  constructor(_config: RpcConfig = {}) {
    throw new Error(
      "RpcUnit server-side handling is not supported on the client side. Use server-side framework instead.",
    );
  }

  async prepare(): Promise<void> {
    return;
  }

  async destroy(): Promise<void> {
    return;
  }
}
