import { boolean, timestamp, varchar } from "drizzle-orm/pg-core";

// Kolom audit standar, dipakai semua tabel.
export const auditColumns = {
  IsActive: boolean("IsActive").notNull().default(true),
  CreatedBy: varchar("CreatedBy", { length: 100 }),
  CreatedDate: timestamp("CreatedDate", { mode: "string" }).notNull().defaultNow(),
  UpdatedBy: varchar("UpdatedBy", { length: 100 }),
  UpdatedDate: timestamp("UpdatedDate", { mode: "string" }),
};
