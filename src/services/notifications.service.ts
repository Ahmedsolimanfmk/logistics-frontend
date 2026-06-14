import { apiAuthGet, apiAuthPost } from "@/src/lib/api";

export type NotificationType = "INFO" | "WARNING" | "ERROR" | "SUCCESS";

export interface SystemNotification {
  id: string;
  company_id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

class NotificationsService {
  async getUnread(): Promise<SystemNotification[]> {
    const res = await apiAuthGet("/notifications/unread");
    if (!res.ok) throw new Error(res.error || "Failed to fetch notifications");
    return res.data || [];
  }

  async markAsRead(notificationIds: string[]): Promise<void> {
    const res = await apiAuthPost("/notifications/mark-read", { notificationIds });
    if (!res.ok) throw new Error(res.error || "Failed to mark as read");
  }

  async runChecks(): Promise<void> {
    const res = await apiAuthPost("/notifications/run-checks", {});
    if (!res.ok) throw new Error(res.error || "Failed to run checks");
  }
}

export const notificationsService = new NotificationsService();
