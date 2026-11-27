import type { Metadata } from "next";
import { WipeDatabasePage } from "@/features/settings/components/wipe-database-page";

export const metadata: Metadata = { title: "Wipe Database" };

export default function SettingsWipeDatabaseRoute() {
  return <WipeDatabasePage />;
}
