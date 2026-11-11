// Tabel transaksi / flow: prefix DATA_
import { boolean, date, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
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
    // Low, Medium, atau High (lihat features/projects/data/priorities.ts).
    Priority: varchar("Priority", { length: 10 }).notNull().default("Medium"),
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

export const dataIssues = pgTable("DATA_Issues", {
  Id: integer("Id").primaryKey().generatedAlwaysAsIdentity(),
  NewId: uuid("NewId").notNull().defaultRandom().unique(),
  Title: varchar("Title", { length: 255 }).notNull().default(""),
  Description: text("Description").notNull().default(""),
  Solution: text("Solution").notNull().default(""),
  RootCause: text("RootCause").notNull().default(""),
  HasRepairCost: boolean("HasRepairCost").notNull().default(false),
  RepairCost: numeric("RepairCost", { precision: 12, scale: 2 }),
  RepairCostDetail: text("RepairCostDetail").notNull().default(""),
  RepairMethod: varchar("RepairMethod", { length: 20 }),
  AdditionalInfoSaved: boolean("AdditionalInfoSaved").notNull().default(false),
  Status: varchar("Status", { length: 30 }).notNull().default("Draft"),
  ClassificationId: integer("ClassificationId").references(() => coreCategory.Id, { onDelete: "set null" }),
  Criticality: varchar("Criticality", { length: 50 }).notNull().default("Tier 2 - Major"),
  PICId: integer("PICId").references(() => coreUser.Id, { onDelete: "set null" }),
  ProjectId: integer("ProjectId").references(() => dataProjects.Id, { onDelete: "set null" }),
  Evidence: jsonb("Evidence").$type<{ name: string; size: number }[]>().notNull().default([]),
  ...auditColumns,
});

export const dataIssueComments = pgTable("DATA_IssueComments", {
  Id: integer("Id").primaryKey().generatedAlwaysAsIdentity(),
  IssueId: integer("IssueId").notNull().references(() => dataIssues.Id, { onDelete: "cascade" }),
  ParentCommentId: integer("ParentCommentId"),
  Author: varchar("Author", { length: 150 }).notNull(),
  Body: text("Body").notNull(),
  ...auditColumns,
});

export const dataIssueActivity = pgTable("DATA_IssueActivity", {
  Id: integer("Id").primaryKey().generatedAlwaysAsIdentity(),
  IssueId: integer("IssueId").notNull().references(() => dataIssues.Id, { onDelete: "cascade" }),
  Actor: varchar("Actor", { length: 150 }).notNull(),
  Action: varchar("Action", { length: 100 }).notNull(),
  Detail: text("Detail").notNull().default(""),
  ...auditColumns,
});

export const dataKanban = pgTable("DATA_Kanban", {
  Id: integer("Id").primaryKey().generatedAlwaysAsIdentity(),
  NewId: uuid("NewId").notNull().defaultRandom().unique(),
  Title: varchar("Title", { length: 255 }).notNull(),
  Status: varchar("Status", { length: 100 }).notNull(),
  Sequence: integer("Sequence").notNull().default(0),
  Payload: jsonb("Payload").$type<Record<string, unknown>>().notNull().default({}),
  ...auditColumns,
});

// Unified event log populated by database triggers for application table mutations.
export const dataAuditTrail = pgTable("DATA_AuditTrail", {
  Id: integer("Id").primaryKey().generatedAlwaysAsIdentity(),
  Actor: varchar("Actor", { length: 255 }).notNull().default("System"),
  Action: varchar("Action", { length: 100 }).notNull(),
  TargetType: varchar("TargetType", { length: 100 }).notNull(),
  TargetName: varchar("TargetName", { length: 255 }).notNull(),
  Detail: text("Detail").notNull().default(""),
  Outcome: varchar("Outcome", { length: 20 }).notNull().default("Success"),
  CreatedDate: timestamp("CreatedDate", { mode: "string" }).notNull().defaultNow(),
});
