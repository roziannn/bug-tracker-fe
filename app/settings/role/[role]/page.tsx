import type { Metadata } from "next";
import { RoleAccessPage } from "@/features/settings/components/role-access-page";

export const metadata: Metadata = {
  title: "Role Access",
};

export default async function SettingsRoleAccessRoute({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  return <RoleAccessPage roleName={decodeURIComponent(role)} />;
}
