/** TTL passed to kvStore for credentials that must never expire. */
export const CREDENTIAL_NO_EXPIRY = 0;

export function buildCredentialRef(): string {
  return `masters:connection:${crypto.randomUUID()}:credential`;
}

export interface EndpointTestResult {
  error?: string;
  ok: boolean;
  status: number | null;
  testedAt: string;
}

export async function testEndpoint(baseUrl: string): Promise<EndpointTestResult> {
  const testedAt = new Date().toISOString();
  try {
    const url = new URL(baseUrl);
    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(10_000),
    });
    return {
      ok: response.ok,
      status: response.status,
      testedAt,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      ok: false,
      status: null,
      testedAt,
    };
  }
}
