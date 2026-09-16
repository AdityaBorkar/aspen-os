export const MASTERS_OWNERSHIP_ENTITY = "masters.entity" as const;

export const MASTERS_OWNERSHIP_SETTING = "masters.setting" as const;

export const MASTERS_OWNERSHIP_UOM = "masters.unit-of-measure" as const;

export function healthcareMasterSettingKey(domain: string, key: string): string {
  return `healthcare.${domain}.${key}`;
}

export interface HealthcareMasterIntent {
  branchId: string;
  domain: string;
  healthcareMasterId: string;
  key: string;
  mastersKey: string;
  value: string;
  version: number;
}

export interface HealthcareMasterIntentOptions {
  branchId: string;
  domain: string;
  healthcareMasterId: string;
  key: string;
  value: string;
  version: number;
}

export function healthcareMasterIntent(
  options: HealthcareMasterIntentOptions,
): HealthcareMasterIntent {
  return {
    branchId: options.branchId,
    domain: options.domain,
    healthcareMasterId: options.healthcareMasterId,
    key: options.key,
    mastersKey: healthcareMasterSettingKey(options.domain, options.key),
    value: options.value,
    version: options.version,
  };
}
