// Tabel transaksi / flow: prefix DATA_
import { date, integer, pgTable, text, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { auditColumns } from "./_columns";
import { coreCategory, coreUser } from "./core";

export const dataProjects = pgTable(
  "DATA_Projects",
  {
    Id: integer("Id").primaryKey().generatedAlwaysAsIdentity(),
    // ID bergaya GUID yang dipakai di URL dan sebagai ID publik project.
    NewId: uuid("NewId").notNull().defaultRandom().unique(),
    Name: varchar("Name", { length: 150 }).notNull(),
    OwnerId: integer("OwnerId")
      .notNull()
      .references(() => coreUser.Id, { onDelete: "restrict" }),
    Description: text("Description").notNull().default(""),
    GoLiveDate: date("GoLiveDate", { mode: "string" }),
    ...auditColumns,
  },
  (t) => [uniqueIndex("DATA_Projects_Name_key").on(t.Name)]
);

// Phase di timeline project (dasar Gantt chart).
export const dataProjectPhases = pgTable("DATA_ProjectPhases", {
  Id: integer("Id").primaryKey().generatedAlwaysAsIdentity(),
  ProjectId: integer("ProjectId")
    .notNull()
    .references(() => dataProjects.Id, { onDelete: "cascade" }),
  Name: varchar("Name", { length: 100 }).notNull(),
  StartDate: date("StartDate", { mode: "string" }).notNull(),
  EndDate: date("EndDate", { mode: "string" }).notNull(),
  Sequence: integer("Sequence").notNull().default(0),
  ...auditColumns,
});

// Tag project = nilai kategori Teams Domain (CORE_Category).
export const dataProjectTags = pgTable(
  "DATA_ProjectTags",
  {
    Id: integer("Id").primaryKey().generatedAlwaysAsIdentity(),
    ProjectId: integer("ProjectId")
      .notNull()
      .references(() => dataProjects.Id, { onDelete: "cascade" }),
    CategoryId: integer("CategoryId")
      .notNull()
      .references(() => coreCategory.Id, { onDelete: "cascade" }),
    ...auditColumns,
  },
  (t) => [uniqueIndex("DATA_ProjectTags_ProjectId_CategoryId_key").on(t.ProjectId, t.CategoryId)]
);

export const dataProjectRepositories = pgTable("DATA_ProjectRepositories", {
  Id: integer("Id").primaryKey().generatedAlwaysAsIdentity(),
  ProjectId: integer("ProjectId")
    .notNull()
    .references(() => dataProjects.Id, { onDelete: "cascade" }),
  Url: varchar("Url", { length: 255 }).notNull(),
  Sequence: integer("Sequence").notNull().default(0),
  ...auditColumns,
});

// URL project di tiap environment (Development, Staging, Production, ...).
export const dataProjectEnvironments = pgTable(
  "DATA_ProjectEnvironments",
  {
    Id: integer("Id").primaryKey().generatedAlwaysAsIdentity(),
    ProjectId: integer("ProjectId")
      .notNull()
      .references(() => dataProjects.Id, { onDelete: "cascade" }),
    Environment: varchar("Environment", { length: 50 }).notNull(),
    Url: varchar("Url", { length: 500 }).notNull(),
    ...auditColumns,
  },
  (t) => [uniqueIndex("DATA_ProjectEnvironments_ProjectId_Environment_key").on(t.ProjectId, t.Environment)]
);
