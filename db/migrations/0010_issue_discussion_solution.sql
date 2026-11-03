ALTER TABLE "DATA_Issues" ADD COLUMN "Solution" text NOT NULL DEFAULT '';

CREATE TABLE "DATA_IssueComments" (
  "Id" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "IssueId" integer NOT NULL REFERENCES "DATA_Issues"("Id") ON DELETE CASCADE,
  "Author" varchar(150) NOT NULL,
  "Body" text NOT NULL,
  "IsActive" boolean NOT NULL DEFAULT true,
  "CreatedBy" varchar(100),
  "CreatedDate" timestamp NOT NULL DEFAULT now(),
  "UpdatedBy" varchar(100),
  "UpdatedDate" timestamp
);
