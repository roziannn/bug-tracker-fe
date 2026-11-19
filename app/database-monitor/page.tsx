import type { Metadata } from "next";
import { DatabaseMonitorPage } from "@/features/settings/components/database-monitor-page";

export const metadata: Metadata = { title: "Database Monitor" };

export default function DatabaseMonitorRoute() {
  return <DatabaseMonitorPage />;
}
