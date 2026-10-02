import bcrypt from "bcryptjs";
import { query } from "@/lib/db";

interface SeedUser {
  name: string;
  email: string;
  password: string;
  roleName: string;
}

const users: SeedUser[] = [
  { name: "Administrator", email: "admin@dev.com", password: "password", roleName: "Administrator" },
  { name: "IT Developer", email: "developer@dev.com", password: "password", roleName: "IT Developer" },
  { name: "QA Engineer", email: "qa@dev.com", password: "password", roleName: "QA Engineer" },
];

async function getOrCreateRole(roleName: string): Promise<number> {
  const existing = await query<{ Id: number }>(`SELECT "Id" FROM "CORE_Role" WHERE "Name" = $1`, [roleName]);
  if (existing[0]) return existing[0].Id;

  const created = await query<{ Id: number }>(
    `INSERT INTO "CORE_Role" ("Name", "IsActive", "CreatedBy", "CreatedDate")
     VALUES ($1, true, 'system', now())
     RETURNING "Id"`,
    [roleName]
  );
  return created[0].Id;
}

async function main() {
  for (const u of users) {
    const existingUser = await query(`SELECT "Id" FROM "CORE_User" WHERE "Email" = $1`, [u.email]);
    if (existingUser[0]) {
      console.log(`Skip ${u.email}, sudah ada`);
      continue;
    }

    const roleId = await getOrCreateRole(u.roleName);
    const hashed = await bcrypt.hash(u.password, 10);

    const rows = await query(
      `INSERT INTO "CORE_User" ("Name", "Email", "Password", "IsActive", "CreatedBy", "CreatedDate")
       VALUES ($1, $2, $3, true, 'system', now())
       RETURNING "Id", "Name", "Email"`,
      [u.name, u.email, hashed]
    );

    await query(
      `INSERT INTO "CORE_RoleClaim" ("RoleId", "Name", "Email", "IsActive", "CreatedBy", "CreatedDate")
       VALUES ($1, $2, $3, true, 'system', now())`,
      [roleId, u.name, u.email]
    );

    console.log(`User dibuat: ${rows[0].Email} (role: ${u.roleName}, password: ${u.password})`);
  }

  console.log("Selesai.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Gagal seed user:", err);
  process.exit(1);
});