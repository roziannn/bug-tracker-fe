import type { Metadata } from "next";
import { MenuSettingsPage } from "@/features/settings/components/menu-settings-page";

export const metadata: Metadata = {
  title: "Menu Settings",
};

export default function SettingsMenuPage() {
  return <MenuSettingsPage />;
}
