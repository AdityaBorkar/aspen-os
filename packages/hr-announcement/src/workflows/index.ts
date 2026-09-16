import { archiveAnnouncement } from "#/workflows/announcement/archive";
import { getAnnouncementById } from "#/workflows/announcement/by-id/get";
import { cancelScheduleAnnouncement } from "#/workflows/announcement/cancel-schedule";
import { createAnnouncement } from "#/workflows/announcement/create";
import { deleteAnnouncement } from "#/workflows/announcement/delete";
import { pinAnnouncement } from "#/workflows/announcement/pin";
import { publishAnnouncement } from "#/workflows/announcement/publish";
import { listRecipients } from "#/workflows/announcement/recipients/list";
import { restoreAnnouncement } from "#/workflows/announcement/restore";
import { scheduleAnnouncement } from "#/workflows/announcement/schedule";
import { getAnnouncementStats } from "#/workflows/announcement/stats/get";
import { unpinAnnouncement } from "#/workflows/announcement/unpin";
import { updateAnnouncement } from "#/workflows/announcement/update";
import { listAnnouncements } from "#/workflows/announcements/list";

export const announcement = {
  archive: archiveAnnouncement,
  cancelSchedule: cancelScheduleAnnouncement,
  create: createAnnouncement,
  delete: deleteAnnouncement,
  getById: getAnnouncementById,
  getStats: getAnnouncementStats,
  list: listAnnouncements,
  listRecipients,
  pin: pinAnnouncement,
  publish: publishAnnouncement,
  restore: restoreAnnouncement,
  schedule: scheduleAnnouncement,
  unpin: unpinAnnouncement,
  update: updateAnnouncement,
} as const;
