// Tabel master / settings: prefix CORE_
import { boolean, integer, pgTable, uuid, varchar, uniqueIndex, type AnyPgColumn } from "drizzle-orm/pg-core";
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

// Menu sidebar. Code = id teks yang dipakai role access (mis. "issues").
export const coreMenu = pgTable("CORE_Menu", {
  Id: integer("Id").primaryKey().generatedAlwaysAsIdentity(),
  Code: varchar("Code", { length: 150 }).notNull().unique(),
  Name: varchar("Name", { length: 100 }).notNull(),
  Path: varchar("Path", { length: 255 }).notNull().default(""),
  Icon: varchar("Icon", { length: 50 }).notNull().default("Circle"),
  ParentId: integer("ParentId").references((): AnyPgColumn => coreMenu.Id, { onDelete: "cascade" }),
  Sequence: integer("Sequence").notNull().default(0),
  IsVisible: boolean("IsVisible").notNull().default(true),
  ...auditColumns,
});

// Button / function yang tersedia di sebuah menu. Code contoh: "issues.create".
export const coreMenuAction = pgTable("CORE_MenuAction", {
  Id: integer("Id").primaryKey().generatedAlwaysAsIdentity(),
  MenuId: integer("MenuId")
    .notNull()
    .references(() => coreMenu.Id, { onDelete: "cascade" }),
  Code: varchar("Code", { length: 200 }).notNull().unique(),
  Name: varchar("Name", { length: 100 }).notNull(),
  ...auditColumns,
});
