import type { Metadata } from "next";
import { UsersSettingsPage } from "@/features/settings/components/users-settings-page";

export const metadata: Metadata = {
  title: "Users",
};

export default function SettingsUsersPage() {
  return <UsersSettingsPage />;
}
