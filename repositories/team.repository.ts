import { query } from "@/lib/db";
import { getCategoryConfig } from "@/features/settings/data/category-store";
import type { CreateTeamMemberInput, TeamInput, UpdateTeamMemberInput } from "@/lib/validation";
import type { Team, TeamMember } from "@/types";

// Domain group team hanya boleh nilai dari kategori Teams Domain.
const DOMAIN_CATEGORY = getCategoryConfig("teams-domain")!.title;

const TEAM_SELECT = `SELECT t."Id", t."NewId", t."DomainId", c."Name" AS "DomainName",
    t."LeadId", u."Name" AS "LeadName", u."Email" AS "LeadEmail",
    (SELECT COUNT(*)::int FROM "CORE_TeamMember" m WHERE m."TeamId" = t."Id" AND m."IsActive" = true) AS "MemberCount",
    t."IsActive", t."CreatedBy", t."CreatedDate", t."UpdatedBy", t."UpdatedDate"
  FROM "CORE_Team" t
  JOIN "CORE_Category" c ON c."Id" = t."DomainId"
  JOIN "CORE_User" u ON u."Id" = t."LeadId"`;

const MEMBER_SELECT = `SELECT m."Id", m."TeamId", m."UserId", u."Name", u."Email", m."AccessLevel", m."IsActive",
    m."CreatedBy", m."CreatedDate", m."UpdatedBy", m."UpdatedDate"
  FROM "CORE_TeamMember" m
  JOIN "CORE_User" u ON u."Id" = m."UserId"`;

export type TeamError = "not-found" | "domain-invalid" | "domain-taken" | "lead-not-found";
export type MemberError = "team-not-found" | "member-not-found" | "user-not-found" | "already-member";

export async function getTeams(): Promise<Team[]> {
  return query<Team>(`${TEAM_SELECT} ORDER BY t."Id"`);
}

// Dicari lewat NewId (ID bergaya GUID), bukan Id angka.
export async function getTeamByNewId(newId: string): Promise<Team | null> {
  const rows = await query<Team>(`${TEAM_SELECT} WHERE t."NewId" = $1`, [newId]);
  return rows[0] ?? null;
}

async function checkTeamReferences(input: TeamInput, ownTeamId: number | null): Promise<TeamError | null> {
  // Domain baru harus aktif. Saat edit, domain milik group itu sendiri tetap boleh walau sudah dinonaktifkan.
  const domain = await query(
    `SELECT 1 FROM "CORE_Category" c
     WHERE c."Id" = $1 AND c."CategoryName" = $2
       AND (c."IsActive" = true OR EXISTS (SELECT 1 FROM "CORE_Team" t WHERE t."Id" = $3 AND t."DomainId" = c."Id"))`,
    [input.domainId, DOMAIN_CATEGORY, ownTeamId]
  );
  if (!domain[0]) return "domain-invalid";

  const taken = await query(`SELECT 1 FROM "CORE_Team" WHERE "DomainId" = $1 AND ($2::int IS NULL OR "Id" <> $2)`, [input.domainId, ownTeamId]);
  if (taken[0]) return "domain-taken";

  const lead = await query(`SELECT 1 FROM "CORE_User" WHERE "Id" = $1 AND "IsActive" = true`, [input.leadId]);
  if (!lead[0]) return "lead-not-found";

  return null;
}

// Dua request dengan domain yang sama bersamaan: constraint unik di database yang menolak yang kedua.
function isUniqueViolation(err: unknown) {
  return (err as { code?: string }).code === "23505";
}

export async function createTeam(input: TeamInput, createdBy: string | null): Promise<Team | TeamError> {
  const problem = await checkTeamReferences(input, null);
  if (problem) return problem;

  try {
    const rows = await query<{ NewId: string }>(
      `INSERT INTO "CORE_Team" ("DomainId", "LeadId", "CreatedBy", "CreatedDate") VALUES ($1, $2, $3, now()) RETURNING "NewId"`,
      [input.domainId, input.leadId, createdBy]
    );
    return (await getTeamByNewId(rows[0].NewId))!;
  } catch (err) {
    if (isUniqueViolation(err)) return "domain-taken";
    throw err;
  }
}

export async function updateTeam(newId: string, input: TeamInput, updatedBy: string | null): Promise<Team | TeamError> {
  const current = await query<{ Id: number }>(`SELECT "Id" FROM "CORE_Team" WHERE "NewId" = $1`, [newId]);
  if (!current[0]) return "not-found";

  const problem = await checkTeamReferences(input, current[0].Id);
  if (problem) return problem;

  try {
    await query(
      `UPDATE "CORE_Team" SET "DomainId" = $1, "LeadId" = $2, "UpdatedBy" = $3, "UpdatedDate" = now() WHERE "Id" = $4`,
      [input.domainId, input.leadId, updatedBy, current[0].Id]
    );
  } catch (err) {
    if (isUniqueViolation(err)) return "domain-taken";
    throw err;
  }
  return (await getTeamByNewId(newId))!;
}

export async function setTeamActive(newId: string, isActive: boolean, updatedBy: string | null): Promise<Team | "not-found"> {
  const rows = await query(
    `UPDATE "CORE_Team" SET "IsActive" = $1, "UpdatedBy" = $2, "UpdatedDate" = now() WHERE "NewId" = $3 RETURNING "Id"`,
    [isActive, updatedBy, newId]
  );
  return rows[0] ? (await getTeamByNewId(newId))! : "not-found";
}

// ---- anggota ----

async function teamIdOf(newId: string): Promise<number | null> {
  const rows = await query<{ Id: number }>(`SELECT "Id" FROM "CORE_Team" WHERE "NewId" = $1`, [newId]);
  return rows[0]?.Id ?? null;
}

export async function getTeamMembers(teamNewId: string): Promise<TeamMember[] | "team-not-found"> {
  const teamId = await teamIdOf(teamNewId);
  if (teamId === null) return "team-not-found";

  return query<TeamMember>(`${MEMBER_SELECT} WHERE m."TeamId" = $1 ORDER BY m."Id"`, [teamId]);
}

async function getMemberById(memberId: number): Promise<TeamMember | null> {
  const rows = await query<TeamMember>(`${MEMBER_SELECT} WHERE m."Id" = $1`, [memberId]);
  return rows[0] ?? null;
}

export async function addTeamMember(teamNewId: string, input: CreateTeamMemberInput, createdBy: string | null): Promise<TeamMember | MemberError> {
  const teamId = await teamIdOf(teamNewId);
  if (teamId === null) return "team-not-found";

  const user = await query(`SELECT 1 FROM "CORE_User" WHERE "Id" = $1 AND "IsActive" = true`, [input.userId]);
  if (!user[0]) return "user-not-found";

  try {
    const rows = await query<{ Id: number }>(
      `INSERT INTO "CORE_TeamMember" ("TeamId", "UserId", "AccessLevel", "CreatedBy", "CreatedDate")
       VALUES ($1, $2, $3, $4, now()) RETURNING "Id"`,
      [teamId, input.userId, input.accessLevel, createdBy]
    );
    return (await getMemberById(rows[0].Id))!;
  } catch (err) {
    if (isUniqueViolation(err)) return "already-member";
    throw err;
  }
}

// Orangnya (user) tidak bisa diganti; yang diubah access level dan status aktif.
export async function updateTeamMember(
  teamNewId: string,
  memberId: number,
  input: UpdateTeamMemberInput,
  updatedBy: string | null
): Promise<TeamMember | MemberError> {
  const teamId = await teamIdOf(teamNewId);
  if (teamId === null) return "team-not-found";

  const rows = await query(
    `UPDATE "CORE_TeamMember"
     SET "AccessLevel" = $1, "IsActive" = COALESCE($2, "IsActive"), "UpdatedBy" = $3, "UpdatedDate" = now()
     WHERE "Id" = $4 AND "TeamId" = $5 RETURNING "Id"`,
    [input.accessLevel, input.isActive ?? null, updatedBy, memberId, teamId]
  );
  return rows[0] ? (await getMemberById(memberId))! : "member-not-found";
}

export async function setTeamMemberActive(
  teamNewId: string,
  memberId: number,
  isActive: boolean,
  updatedBy: string | null
): Promise<TeamMember | MemberError> {
  const teamId = await teamIdOf(teamNewId);
  if (teamId === null) return "team-not-found";

  const rows = await query(
    `UPDATE "CORE_TeamMember" SET "IsActive" = $1, "UpdatedBy" = $2, "UpdatedDate" = now()
     WHERE "Id" = $3 AND "TeamId" = $4 RETURNING "Id"`,
    [isActive, updatedBy, memberId, teamId]
  );
  return rows[0] ? (await getMemberById(memberId))! : "member-not-found";
}
