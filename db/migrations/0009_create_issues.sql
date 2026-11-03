CREATE TABLE "DATA_Issues" (
  "Id" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "NewId" uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  "Title" varchar(255) NOT NULL DEFAULT '',
  "Description" text NOT NULL DEFAULT '',
  "Status" varchar(30) NOT NULL DEFAULT 'Draft',
  "ClassificationId" integer REFERENCES "CORE_Category"("Id") ON DELETE SET NULL,
  "Criticality" varchar(50) NOT NULL DEFAULT 'Tier 2 - Major',
  "PICId" integer REFERENCES "CORE_User"("Id") ON DELETE SET NULL,
  "ProjectId" integer REFERENCES "DATA_Projects"("Id") ON DELETE SET NULL,
  "Evidence" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "IsActive" boolean NOT NULL DEFAULT true,
  "CreatedBy" varchar(100),
  "CreatedDate" timestamp NOT NULL DEFAULT now(),
  "UpdatedBy" varchar(100),
  "UpdatedDate" timestamp
);
