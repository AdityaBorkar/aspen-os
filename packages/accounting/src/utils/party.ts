import { PARTY_TYPE } from "#/utils/constants";
import type { PartyType } from "#/utils/constants";

export function normalizePartyType(value: string | null | undefined): PartyType | null {
  if (value === PARTY_TYPE.CUSTOMER) {
    return PARTY_TYPE.CUSTOMER;
  }
  if (value === PARTY_TYPE.VENDOR) {
    return PARTY_TYPE.VENDOR;
  }
  return null;
}
