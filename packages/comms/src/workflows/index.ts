import { activateChannel } from "./channel/activate";
import { deactivateChannel } from "./channel/deactivate";
import { getChannel } from "./channel/get";
import { listChannels } from "./channel/list";
import { setDefaultChannel } from "./channel/set-default";
import { updateChannel } from "./channel/update";
import { getMessage } from "./message/get";
import { listMessages } from "./message/list";
import { retryMessage } from "./message/retry";
import { dismiss } from "./notification/dismiss";
import { getNotification } from "./notification/get";
import { getInbox } from "./notification/get-inbox";
import { listNotifications } from "./notification/list";
import { markRead } from "./notification/mark-read";
import { markUnread } from "./notification/mark-unread";
import { notify } from "./notification/notify";
import { unreadCount } from "./notification/unread-count";
import { getPreference } from "./preference/get";
import { listPreferences } from "./preference/list";
import { setPreference } from "./preference/set";
import { activateProvider } from "./provider/activate";
import { deactivateProvider } from "./provider/deactivate";
import { getProvider } from "./provider/get";
import { listProviders } from "./provider/list";
import { updateProvider } from "./provider/update";
import { getSettingWorkflow } from "./setting/get";
import { setSettingWorkflow } from "./setting/set";
import { activateTemplate } from "./template/activate";
import { createTemplate } from "./template/create";
import { deactivateTemplate } from "./template/deactivate";
import { getTemplate } from "./template/get";
import { listTemplates } from "./template/list";
import { updateTemplate } from "./template/update";

export const channelActions = {
  activate: activateChannel,
  deactivate: deactivateChannel,
  get: getChannel,
  list: listChannels,
  setDefault: setDefaultChannel,
  update: updateChannel,
} as const;

export const providerActions = {
  activate: activateProvider,
  deactivate: deactivateProvider,
  get: getProvider,
  list: listProviders,
  update: updateProvider,
} as const;

export const notifications = {
  dismiss,
  get: getNotification,
  getInbox,
  list: listNotifications,
  markRead,
  markUnread,
  notify,
  unreadCount,
} as const;

export const preferences = {
  get: getPreference,
  list: listPreferences,
  set: setPreference,
} as const;

export const templates = {
  activate: activateTemplate,
  create: createTemplate,
  deactivate: deactivateTemplate,
  get: getTemplate,
  list: listTemplates,
  update: updateTemplate,
} as const;

export const settings = {
  get: getSettingWorkflow,
  set: setSettingWorkflow,
} as const;

export const messages = {
  get: getMessage,
  list: listMessages,
  retry: retryMessage,
} as const;
