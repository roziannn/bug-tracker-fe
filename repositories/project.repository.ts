import { getPool, query } from "@/lib/db";
import { getCategoryConfig } from "@/features/settings/data/category-store";
import type { CreateProjectInput } from "@/lib/validation";
import type { Project, ProjectDetail } from "@/types";

// Tag project hanya boleh nilai dari kategori Teams Domain.
const TAG_CATEGORY = getCategoryConfig("teams-domain")!.title;

// Kolom date dikirim sebagai teks "YYYY-MM-DD" supaya tidak bergeser karena zona waktu.
const PROJECT_COLUMNS = `p."Id", p."NewId", p."Name", p."OwnerId", u."Name" AS "OwnerName", p."Description",
  p."GoLiveDate"::text AS "GoLiveDate", p."IsActive", p."CreatedBy", p."CreatedDate", p."UpdatedBy", p."UpdatedDate"`;

export async function getProjects(): Promise<Project[]> {
  return query<Project>(
    `SELECT ${PROJECT_COLUMNS},
       COALESCE((
         SELECT array_agg(c."Name" ORDER BY c."Id")
         FROM "DATA_ProjectTags" t JOIN "CORE_Category" c ON c."Id" = t."CategoryId"
         WHERE t."ProjectId" = p."Id"
       ), '{}') AS "Tags",
       (SELECT COUNT(*)::int FROM "DATA_ProjectPhases" ph WHERE ph."ProjectId" = p."Id") AS "PhaseCount"
     FROM "DATA_Projects" p
     JOIN "CORE_User" u ON u."Id" = p."OwnerId"
     ORDER BY p."Id" DESC`
  );
}

// Dicari lewat NewId (ID bergaya GUID), bukan Id angka.
export async function getProjectDetail(newId: string): Promise<ProjectDetail | null> {
  const projects = await query<Omit<ProjectDetail, "Tags" | "Phases" | "Repositories" | "Environments">>(
    `SELECT ${PROJECT_COLUMNS} FROM "DATA_Projects" p JOIN "CORE_User" u ON u."Id" = p."OwnerId" WHERE p."NewId" = $1`,
    [newId]
  );
  const project = projects[0];
  if (!project) return null;

  const [tags, phases, repositories, environments] = await Promise.all([
    query<{ Id: number; Name: string }>(
      `SELECT c."Id", c."Name" FROM "DATA_ProjectTags" t JOIN "CORE_Category" c ON c."Id" = t."CategoryId"
       WHERE t."ProjectId" = $1 ORDER BY c."Id"`,
      [project.Id]
    ),
    query<ProjectDetail["Phases"][number]>(
      `SELECT "Id", "Name", "StartDate"::text AS "StartDate", "EndDate"::text AS "EndDate", "Sequence"
       FROM "DATA_ProjectPhases" WHERE "ProjectId" = $1 ORDER BY "Sequence", "Id"`,
      [project.Id]
    ),
    query<{ Url: string }>(`SELECT "Url" FROM "DATA_ProjectRepositories" WHERE "ProjectId" = $1 ORDER BY "Sequence", "Id"`, [project.Id]),
    query<{ Environment: string; Url: string }>(
      `SELECT "Environment", "Url" FROM "DATA_ProjectEnvironments" WHERE "ProjectId" = $1 ORDER BY "Id"`,
      [project.Id]
    ),
  ]);

  return { ...project, Tags: tags, Phases: phases, Repositories: repositories.map((row) => row.Url), Environments: environments };
}

export type CreateProjectError = "name-taken" | "owner-not-found" | "invalid-tags";

export async function createProject(
  input: CreateProjectInput,
  createdBy: string | null
): Promise<{ project: ProjectDetail } | { error: CreateProjectError }> {
  // Isian kosong dibuang, repository yang sama (tanpa membedakan huruf besar/kecil) hanya disimpan sekali.
  const uniqueRepositories = new Map<string, string>();
  for (const value of input.repositories.map((item) => item.trim()).filter(Boolean)) {
    if (!uniqueRepositories.has(value.toLowerCase())) uniqueRepositories.set(value.toLowerCase(), value);
  }
  const repositories = Array.from(uniqueRepositories.values());
  const environments = Object.entries(input.environments)
    .map(([environment, url]) => [environment.trim(), url.trim()] as const)
    .filter(([, url]) => url !== "");
  const tagIds = Array.from(new Set(input.tags));

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    const owner = await client.query(`SELECT 1 FROM "CORE_User" WHERE "Id" = $1 AND "IsActive" = true`, [input.ownerId]);
    if (!owner.rowCount) return rollback(client, "owner-not-found");

    const duplicate = await client.query(`SELECT 1 FROM "DATA_Projects" WHERE lower("Name") = lower($1)`, [input.name]);
    if (duplicate.rowCount) return rollback(client, "name-taken");

    if (tagIds.length) {
      const valid = await client.query(
        `SELECT COUNT(*)::int AS total FROM "CORE_Category" WHERE "Id" = ANY($1::int[]) AND "CategoryName" = $2`,
        [tagIds, TAG_CATEGORY]
      );
      if (valid.rows[0].total !== tagIds.length) return rollback(client, "invalid-tags");
    }

    const created = await client.query<{ Id: number; NewId: string }>(
      `INSERT INTO "DATA_Projects" ("Name", "OwnerId", "Description", "GoLiveDate", "CreatedBy", "CreatedDate")
       VALUES ($1, $2, $3, $4, $5, now())
       RETURNING "Id", "NewId"`,
      [input.name, input.ownerId, input.description, input.goLiveDate || null, createdBy]
    );
    const { Id: projectId, NewId: newId } = created.rows[0];

    for (const [index, phase] of input.phases.entries()) {
      await client.query(
        `INSERT INTO "DATA_ProjectPhases" ("ProjectId", "Name", "StartDate", "EndDate", "Sequence", "CreatedBy", "CreatedDate")
         VALUES ($1, $2, $3, $4, $5, $6, now())`,
        [projectId, phase.name, phase.start, phase.end, index + 1, createdBy]
      );
    }
    for (const categoryId of tagIds) {
      await client.query(
        `INSERT INTO "DATA_ProjectTags" ("ProjectId", "CategoryId", "CreatedBy", "CreatedDate") VALUES ($1, $2, $3, now())`,
        [projectId, categoryId, createdBy]
      );
    }
    for (const [index, url] of repositories.entries()) {
      await client.query(
        `INSERT INTO "DATA_ProjectRepositories" ("ProjectId", "Url", "Sequence", "CreatedBy", "CreatedDate") VALUES ($1, $2, $3, $4, now())`,
        [projectId, url, index + 1, createdBy]
      );
    }
    for (const [environment, url] of environments) {
      await client.query(
        `INSERT INTO "DATA_ProjectEnvironments" ("ProjectId", "Environment", "Url", "CreatedBy", "CreatedDate") VALUES ($1, $2, $3, $4, now())`,
        [projectId, environment, url, createdBy]
      );
    }

    await client.query("COMMIT");
    return { project: (await getProjectDetail(newId))! };
  } catch (err) {
    await client.query("ROLLBACK");
    // Dua request dengan nama yang sama bersamaan: indeks unik di database yang menolak yang kedua.
    if ((err as { code?: string }).code === "23505") return { error: "name-taken" };
    throw err;
  } finally {
    client.release();
  }
}

async function rollback(client: { query: (text: string) => Promise<unknown> }, error: CreateProjectError) {
  await client.query("ROLLBACK");
  return { error };
}
