import type { Metadata } from "next";
import { NotificationsPage } from "@/features/notifications/components/notifications-page";

export const metadata: Metadata = { title: "Notifikasi" };

export default function NotificationsRoute() {
  return <NotificationsPage />;
}
