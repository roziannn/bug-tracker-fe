import type { Metadata } from "next";
import { RoleSettingsPage } from "@/features/settings/components/role-settings-page";

export const metadata: Metadata = {
  title: "Role Settings",
};

export default function SettingsRolePage() {
  return <RoleSettingsPage />;
}
