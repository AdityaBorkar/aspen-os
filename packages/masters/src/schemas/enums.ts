import {
  CONTACT_TYPE,
  CONNECTION_STATUS,
  INTEGRATION_TYPE,
  MASTER_ENTITY_TYPE,
  NOTE_TYPE,
} from "@aspen-os/constants";
import { picklist } from "valibot";

export const MasterEntityTypeSchema = picklist(Object.values(MASTER_ENTITY_TYPE));

export const ContactTypeSchema = picklist(Object.values(CONTACT_TYPE));

export const IntegrationTypeSchema = picklist(Object.values(INTEGRATION_TYPE));

export const ConnectionStatusSchema = picklist(Object.values(CONNECTION_STATUS));

export const NoteTypeSchema = picklist(Object.values(NOTE_TYPE));

export { CONTACT_TYPE, CONNECTION_STATUS, INTEGRATION_TYPE, MASTER_ENTITY_TYPE, NOTE_TYPE };
