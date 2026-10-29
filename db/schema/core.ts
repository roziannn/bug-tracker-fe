// Tabel master / settings: prefix CORE_
import { integer, pgTable, uuid, varchar, uniqueIndex } from "drizzle-orm/pg-core";
import { auditColumns } from "./_columns";

export const coreRole = pgTable("CORE_Role", {
  Id: integer("Id").primaryKey().generatedAlwaysAsIdentity(),
  NewId: uuid("NewId").notNull().defaultRandom().unique(),
  Name: varchar("Name", { length: 100 }).notNull().unique(),
  ...auditColumns,
});

export const coreUser = pgTable(
  "CORE_User",
  {
    Id: integer("Id").primaryKey().generatedAlwaysAsIdentity(),
    Name: varchar("Name", { length: 150 }).notNull(),
    Email: varchar("Email", { length: 255 }).notNull(),
    Password: varchar("Password", { length: 255 }).notNull(),
    ...auditColumns,
  },
  (t) => [uniqueIndex("CORE_User_Email_key").on(t.Email)]
);

// Relasi user <-> role (dipakai repository yang sudah ada)
export const coreRoleClaim = pgTable("CORE_RoleClaim", {
  Id: integer("Id").primaryKey().generatedAlwaysAsIdentity(),
  RoleId: integer("RoleId")
    .notNull()
    .references(() => coreRole.Id),
  Name: varchar("Name", { length: 150 }).notNull(),
  Email: varchar("Email", { length: 255 }).notNull(),
  ...auditColumns,
});
