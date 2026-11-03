CREATE TABLE "DATA_IssueActivity" (
  "Id" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "IssueId" integer NOT NULL REFERENCES "DATA_Issues"("Id") ON DELETE CASCADE,
  "Actor" varchar(150) NOT NULL,
  "Action" varchar(100) NOT NULL,
  "Detail" text NOT NULL DEFAULT '',
  "IsActive" boolean NOT NULL DEFAULT true,
  "CreatedBy" varchar(100),
  "CreatedDate" timestamp NOT NULL DEFAULT now(),
  "UpdatedBy" varchar(100),
  "UpdatedDate" timestamp
);

INSERT INTO "DATA_IssueActivity" ("IssueId", "Actor", "Action", "Detail", "CreatedBy", "CreatedDate")
SELECT "Id", COALESCE("CreatedBy", 'System'),
  CASE WHEN "Status" = 'Draft' THEN 'Draft created' ELSE 'Issue created' END,
  "Title", "CreatedBy", "CreatedDate"
FROM "DATA_Issues";
