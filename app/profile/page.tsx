import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfilePage } from "@/features/profile/components/profile-page";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/repositories/access.repository";

export const metadata: Metadata = {
  title: "Profile",
};

export const dynamic = "force-dynamic";

export default async function ProfileRoute() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await getCurrentUser(session.email);
  if (!user) redirect("/login");

  const [issueCounts, teams] = await Promise.all([
    query<{ openIssues: string; closedIssues: string }>(
      `SELECT
        COUNT(*) FILTER (WHERE lower("Status") <> 'done')::text AS "openIssues",
        COUNT(*) FILTER (WHERE lower("Status") = 'done')::text AS "closedIssues"
       FROM "DATA_Issues"
       WHERE "IsActive" = true AND lower("CreatedBy") = lower($1)`,
      [user.email]
    ),
    query<{ team: string | null }>(
      `SELECT string_agg(DISTINCT c."Name", ', ' ORDER BY c."Name") AS team
       FROM "CORE_TeamMember" tm
       JOIN "CORE_Team" t ON t."Id" = tm."TeamId" AND t."IsActive" = true
       JOIN "CORE_Category" c ON c."Id" = t."DomainId" AND c."IsActive" = true
       JOIN "CORE_User" u ON u."Id" = tm."UserId"
       WHERE lower(u."Email") = lower($1) AND tm."IsActive" = true`,
      [user.email]
    ),
  ]);

  return (
    <ProfilePage
      profile={{
        name: user.name,
        email: user.email,
        role: user.role?.name || "No role assigned",
        team: teams[0]?.team || "Not assigned",
        openIssues: Number(issueCounts[0]?.openIssues ?? 0),
        closedIssues: Number(issueCounts[0]?.closedIssues ?? 0),
      }}
    />
  );
}
