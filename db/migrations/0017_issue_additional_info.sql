ALTER TABLE "DATA_Issues"
  ADD COLUMN "HasRepairCost" boolean NOT NULL DEFAULT false,
  ADD COLUMN "RepairCost" numeric(12, 2),
  ADD COLUMN "RepairCostDetail" text NOT NULL DEFAULT '',
  ADD COLUMN "RepairMethod" varchar(20);