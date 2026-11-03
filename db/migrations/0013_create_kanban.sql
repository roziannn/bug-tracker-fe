CREATE TABLE "DATA_Kanban" (
  "Id" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "NewId" uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  "Title" varchar(255) NOT NULL,
  "Status" varchar(100) NOT NULL,
  "Sequence" integer NOT NULL DEFAULT 0,
  "Payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "IsActive" boolean NOT NULL DEFAULT true,
  "CreatedBy" varchar(100),
  "CreatedDate" timestamp NOT NULL DEFAULT now(),
  "UpdatedBy" varchar(100),
  "UpdatedDate" timestamp
);

CREATE INDEX "IDX_DATA_Kanban_Status_Sequence"
  ON "DATA_Kanban" ("Status", "Sequence", "Id")
  WHERE "IsActive" = true;
