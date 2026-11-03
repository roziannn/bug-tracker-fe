import type { PoolClient } from "pg";
import { getPool, query } from "@/lib/db";
import { getCategoryConfig } from "@/features/settings/data/category-store";
import type { CreateProjectInput } from "@/lib/validation";
import type { Project, ProjectDetail } from "@/types";

// Tag project hanya boleh nilai dari kategori Teams Domain.
const TAG_CATEGORY = getCategoryConfig("teams-domain")!.title;

// Kolom date dikirim sebagai teks "YYYY-MM-DD" supaya tidak bergeser karena zona waktu.
const PROJECT_COLUMNS = `p."Id", p."NewId", p."Name", p."OwnerId", u."Name" AS "OwnerName", p."Description", p."Priority",
  p."GoLiveDate"::text AS "GoLiveDate", p."IsActive", p."CreatedBy", p."CreatedDate", p."UpdatedBy", p."UpdatedDate"`;

export async function getProjects(): Promise<Project[]> {
  return query<Project>(
    `SELECT ${PROJECT_COLUMNS},
       COALESCE((
         SELECT array_agg(c."Name" ORDER BY c."Id")
         FROM "DATA_ProjectTags" t JOIN "CORE_Category" c ON c."Id" = t."CategoryId"
         WHERE t."ProjectId" = p."Id"
       ), '{}') AS "Tags",
       (SELECT COUNT(*)::int FROM "DATA_ProjectPhases" ph WHERE ph."ProjectId" = p."Id") AS "PhaseCount",
       COALESCE((
         SELECT json_agg(
           json_build_object('Name', ph."Name", 'StartDate', ph."StartDate"::text, 'EndDate', ph."EndDate"::text)
           ORDER BY ph."Sequence", ph."Id"
         )
         FROM "DATA_ProjectPhases" ph WHERE ph."ProjectId" = p."Id"
       ), '[]'::json) AS "Phases",
       (SELECT MIN("StartDate")::text FROM "DATA_ProjectPhases" ph WHERE ph."ProjectId" = p."Id") AS "TimelineStart",
       (SELECT MAX("EndDate")::text FROM "DATA_ProjectPhases" ph WHERE ph."ProjectId" = p."Id") AS "TimelineEnd"
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

export type ProjectError = "name-taken" | "owner-not-found" | "invalid-tags";
export type ProjectResult = { project: ProjectDetail } | { error: ProjectError | "not-found" };

// Isian anak project dirapikan: yang kosong dibuang, repository yang sama (tanpa membedakan huruf besar/kecil)
// hanya disimpan sekali dengan penulisan yang pertama.
function normalizeChildren(input: CreateProjectInput) {
  const uniqueRepositories = new Map<string, string>();
  for (const value of input.repositories.map((item) => item.trim()).filter(Boolean)) {
    if (!uniqueRepositories.has(value.toLowerCase())) uniqueRepositories.set(value.toLowerCase(), value);
  }

  return {
    repositories: Array.from(uniqueRepositories.values()),
    environments: Object.entries(input.environments)
      .map(([environment, url]) => [environment.trim(), url.trim()] as const)
      .filter(([, url]) => url !== ""),
    tagIds: Array.from(new Set(input.tags)),
  };
}

// Owner harus user aktif, nama project tidak boleh kembar (selain project itu sendiri saat edit), dan tag harus nilai Teams Domain.
async function checkReferences(
  client: PoolClient,
  input: CreateProjectInput,
  tagIds: number[],
  ownProjectId: number | null
): Promise<ProjectError | null> {
  const owner = await client.query(`SELECT 1 FROM "CORE_User" WHERE "Id" = $1 AND "IsActive" = true`, [input.ownerId]);
  if (!owner.rowCount) return "owner-not-found";

  const duplicate = await client.query(
    `SELECT 1 FROM "DATA_Projects" WHERE lower("Name") = lower($1) AND ($2::int IS NULL OR "Id" <> $2)`,
    [input.name, ownProjectId]
  );
  if (duplicate.rowCount) return "name-taken";

  if (tagIds.length) {
    const valid = await client.query(
      `SELECT COUNT(*)::int AS total FROM "CORE_Category" WHERE "Id" = ANY($1::int[]) AND "CategoryName" = $2`,
      [tagIds, TAG_CATEGORY]
    );
    if (valid.rows[0].total !== tagIds.length) return "invalid-tags";
  }
  return null;
}

async function insertChildren(
  client: PoolClient,
  projectId: number,
  input: CreateProjectInput,
  children: ReturnType<typeof normalizeChildren>,
  by: string | null
) {
  for (const [index, phase] of input.phases.entries()) {
    await client.query(
      `INSERT INTO "DATA_ProjectPhases" ("ProjectId", "Name", "StartDate", "EndDate", "Sequence", "CreatedBy", "CreatedDate")
       VALUES ($1, $2, $3, $4, $5, $6, now())`,
      [projectId, phase.name, phase.start, phase.end, index + 1, by]
    );
  }
  for (const categoryId of children.tagIds) {
    await client.query(
      `INSERT INTO "DATA_ProjectTags" ("ProjectId", "CategoryId", "CreatedBy", "CreatedDate") VALUES ($1, $2, $3, now())`,
      [projectId, categoryId, by]
    );
  }
  for (const [index, url] of children.repositories.entries()) {
    await client.query(
      `INSERT INTO "DATA_ProjectRepositories" ("ProjectId", "Url", "Sequence", "CreatedBy", "CreatedDate") VALUES ($1, $2, $3, $4, now())`,
      [projectId, url, index + 1, by]
    );
  }
  for (const [environment, url] of children.environments) {
    await client.query(
      `INSERT INTO "DATA_ProjectEnvironments" ("ProjectId", "Environment", "Url", "CreatedBy", "CreatedDate") VALUES ($1, $2, $3, $4, now())`,
      [projectId, environment, url, by]
    );
  }
}

// Menjalankan pekerjaan dalam satu transaksi. `run` mengembalikan NewId project kalau berhasil, atau { error } untuk membatalkan semuanya.
async function inTransaction(run: (client: PoolClient) => Promise<string | { error: ProjectError | "not-found" }>): Promise<ProjectResult> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await run(client);

    if (typeof result !== "string") {
      await client.query("ROLLBACK");
      return result;
    }

    await client.query("COMMIT");
    return { project: (await getProjectDetail(result))! };
  } catch (err) {
    await client.query("ROLLBACK");
    // Dua request dengan nama yang sama bersamaan: indeks unik di database yang menolak yang kedua.
    if ((err as { code?: string }).code === "23505") return { error: "name-taken" };
    throw err;
  } finally {
    client.release();
  }
}

export async function createProject(input: CreateProjectInput, createdBy: string | null): Promise<ProjectResult> {
  const children = normalizeChildren(input);

  return inTransaction(async (client) => {
    const problem = await checkReferences(client, input, children.tagIds, null);
    if (problem) return { error: problem };

    const created = await client.query<{ Id: number; NewId: string }>(
      `INSERT INTO "DATA_Projects" ("Name", "OwnerId", "Description", "Priority", "GoLiveDate", "CreatedBy", "CreatedDate")
       VALUES ($1, $2, $3, $4, $5, $6, now())
       RETURNING "Id", "NewId"`,
      [input.name, input.ownerId, input.description, input.priority, input.goLiveDate || null, createdBy]
    );

    await insertChildren(client, created.rows[0].Id, input, children, createdBy);
    return created.rows[0].NewId;
  });
}

// Mengganti isi project. Phase, tag, repository, dan URL environment ditulis ulang sesuai kiriman (yang tidak dikirim terhapus).
export async function updateProject(newId: string, input: CreateProjectInput, updatedBy: string | null): Promise<ProjectResult> {
  const children = normalizeChildren(input);

  return inTransaction(async (client) => {
    const existing = await client.query<{ Id: number }>(`SELECT "Id" FROM "DATA_Projects" WHERE "NewId" = $1`, [newId]);
    if (!existing.rowCount) return { error: "not-found" as const };
    const projectId = existing.rows[0].Id;

    const problem = await checkReferences(client, input, children.tagIds, projectId);
    if (problem) return { error: problem };

    await client.query(
      `UPDATE "DATA_Projects"
       SET "Name" = $1, "OwnerId" = $2, "Description" = $3, "Priority" = $4, "GoLiveDate" = $5, "UpdatedBy" = $6, "UpdatedDate" = now()
       WHERE "Id" = $7`,
      [input.name, input.ownerId, input.description, input.priority, input.goLiveDate || null, updatedBy, projectId]
    );

    for (const table of ["DATA_ProjectPhases", "DATA_ProjectTags", "DATA_ProjectRepositories", "DATA_ProjectEnvironments"]) {
      await client.query(`DELETE FROM "${table}" WHERE "ProjectId" = $1`, [projectId]);
    }
    await insertChildren(client, projectId, input, children, updatedBy);
    return newId;
  });
}
