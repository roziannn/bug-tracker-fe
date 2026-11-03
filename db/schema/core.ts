// Tabel master / settings: prefix CORE_
import { boolean, integer, pgTable, text, uuid, varchar, uniqueIndex, type AnyPgColumn } from "drizzle-orm/pg-core";
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

// Izin role: menu mana yang boleh dilihat (muncul di sidebar).
export const coreRoleMenu = pgTable(
  "CORE_RoleMenu",
  {
    Id: integer("Id").primaryKey().generatedAlwaysAsIdentity(),
    RoleId: integer("RoleId")
      .notNull()
      .references(() => coreRole.Id, { onDelete: "cascade" }),
    MenuId: integer("MenuId")
      .notNull()
      .references(() => coreMenu.Id, { onDelete: "cascade" }),
    ...auditColumns,
  },
  (t) => [uniqueIndex("CORE_RoleMenu_RoleId_MenuId_key").on(t.RoleId, t.MenuId)]
);

// Izin role: button / function mana yang boleh dipakai.
export const coreRoleMenuAction = pgTable(
  "CORE_RoleMenuAction",
  {
    Id: integer("Id").primaryKey().generatedAlwaysAsIdentity(),
    RoleId: integer("RoleId")
      .notNull()
      .references(() => coreRole.Id, { onDelete: "cascade" }),
    MenuActionId: integer("MenuActionId")
      .notNull()
      .references(() => coreMenuAction.Id, { onDelete: "cascade" }),
    ...auditColumns,
  },
  (t) => [uniqueIndex("CORE_RoleMenuAction_RoleId_MenuActionId_key").on(t.RoleId, t.MenuActionId)]
);

// Variabel environment per environment (Development, Staging, Production), sesuai halaman Settings → Environment.
export const coreEnv = pgTable(
  "CORE_Env",
  {
    Id: integer("Id").primaryKey().generatedAlwaysAsIdentity(),
    Environment: varchar("Environment", { length: 50 }).notNull(),
    Label: varchar("Label", { length: 100 }).notNull(),
    Key: varchar("Key", { length: 100 }).notNull(),
    Value: text("Value").notNull().default(""),
    IsSecret: boolean("IsSecret").notNull().default(false),
    ...auditColumns,
  },
  (t) => [uniqueIndex("CORE_Env_Environment_Key_key").on(t.Environment, t.Key)]
);

// Nilai-nilai kategori (Settings → Categories). CategoryName = nama kategorinya (mis. "Audit Trail Outcome"),
// Name = salah satu nilainya (mis. "Success"). Satu nilai satu baris.
export const coreCategory = pgTable(
  "CORE_Category",
  {
    Id: integer("Id").primaryKey().generatedAlwaysAsIdentity(),
    CategoryName: varchar("CategoryName", { length: 100 }).notNull(),
    Name: varchar("Name", { length: 100 }).notNull(),
    Description: varchar("Description", { length: 255 }).notNull().default(""),
    ...auditColumns,
  },
  (t) => [uniqueIndex("CORE_Category_CategoryName_Name_key").on(t.CategoryName, t.Name)]
);
