import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Database Monitor" };

export default function SettingsDatabaseMonitorRoute() {
  redirect("/database-monitor");
}
