CREATE TABLE "DATA_ServiceRequests" (
  "Id" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "NewId" uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  "RequestNumber" varchar(20) NOT NULL UNIQUE,
  "Title" varchar(255) NOT NULL DEFAULT '',
  "Description" text NOT NULL DEFAULT '',
  "Type" varchar(40) NOT NULL DEFAULT 'Lainnya',
  "Priority" varchar(20) NOT NULL DEFAULT 'Medium',
  "ProjectId" integer REFERENCES "DATA_Projects"("Id") ON DELETE SET NULL,
  "RequesterId" integer REFERENCES "CORE_User"("Id") ON DELETE SET NULL,
  "PICId" integer REFERENCES "CORE_User"("Id") ON DELETE SET NULL,
  "BusinessJustification" text NOT NULL DEFAULT '',
  "RequestedTargetDate" date,
  "EstimatedEffort" varchar(100) NOT NULL DEFAULT '',
  "Status" varchar(30) NOT NULL DEFAULT 'Draft',
  "ReviewComment" text NOT NULL DEFAULT '',
  "IsActive" boolean NOT NULL DEFAULT true,
  "CreatedBy" varchar(100),
  "CreatedDate" timestamp NOT NULL DEFAULT now(),
  "UpdatedBy" varchar(100),
  "UpdatedDate" timestamp
);

CREATE TABLE "DATA_ServiceRequestComments" (
  "Id" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "ServiceRequestId" integer NOT NULL REFERENCES "DATA_ServiceRequests"("Id") ON DELETE CASCADE,
  "ParentCommentId" integer REFERENCES "DATA_ServiceRequestComments"("Id") ON DELETE CASCADE,
  "AuthorId" integer REFERENCES "CORE_User"("Id") ON DELETE SET NULL,
  "Author" varchar(150) NOT NULL,
  "Body" text NOT NULL,
  "IsActive" boolean NOT NULL DEFAULT true,
  "CreatedBy" varchar(100),
  "CreatedDate" timestamp NOT NULL DEFAULT now(),
  "UpdatedBy" varchar(100),
  "UpdatedDate" timestamp
);

CREATE TABLE "DATA_ServiceRequestActivities" (
  "Id" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "ServiceRequestId" integer NOT NULL REFERENCES "DATA_ServiceRequests"("Id") ON DELETE CASCADE,
  "Actor" varchar(150) NOT NULL,
  "Action" varchar(100) NOT NULL,
  "Detail" text NOT NULL DEFAULT '',
  "CreatedBy" varchar(100),
  "CreatedDate" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE "DATA_ServiceRequestAttachments" (
  "Id" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "ServiceRequestId" integer NOT NULL REFERENCES "DATA_ServiceRequests"("Id") ON DELETE CASCADE,
  "Name" varchar(255) NOT NULL,
  "Size" integer NOT NULL DEFAULT 0,
  "MimeType" varchar(150) NOT NULL DEFAULT '',
  "Content" bytea,
  "IsActive" boolean NOT NULL DEFAULT true,
  "CreatedBy" varchar(100),
  "UpdatedBy" varchar(100),
  "UpdatedDate" timestamp,
  "CreatedDate" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE "DATA_ServiceRequestIssues" (
  "Id" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "ServiceRequestId" integer NOT NULL REFERENCES "DATA_ServiceRequests"("Id") ON DELETE CASCADE,
  "IssueId" integer NOT NULL REFERENCES "DATA_Issues"("Id") ON DELETE CASCADE,
  "IsActive" boolean NOT NULL DEFAULT true,
  "CreatedBy" varchar(100),
  "UpdatedBy" varchar(100),
  "UpdatedDate" timestamp,
  "CreatedDate" timestamp NOT NULL DEFAULT now(),
  UNIQUE ("ServiceRequestId", "IssueId")
);

UPDATE "CORE_Menu" SET "Sequence" = "Sequence" + 1 WHERE "Sequence" >= 3 AND NOT EXISTS (SELECT 1 FROM "CORE_Menu" WHERE "Code" = 'service-requests');

CREATE INDEX "DATA_ServiceRequests_Status_Priority_ProjectId_idx" ON "DATA_ServiceRequests" ("Status", "Priority", "ProjectId");
CREATE INDEX "DATA_ServiceRequestComments_ServiceRequestId_idx" ON "DATA_ServiceRequestComments" ("ServiceRequestId", "CreatedDate");
CREATE INDEX "DATA_ServiceRequestActivities_ServiceRequestId_idx" ON "DATA_ServiceRequestActivities" ("ServiceRequestId", "CreatedDate");

INSERT INTO "CORE_Menu" ("Code", "Name", "Path", "Icon", "Sequence", "IsVisible", "CreatedBy", "CreatedDate")
VALUES ('service-requests', 'Service Requests', '/service-requests', 'ClipboardList', 3, true, 'System', now())
ON CONFLICT ("Code") DO NOTHING;

INSERT INTO "CORE_MenuAction" ("MenuId", "Code", "Name", "CreatedBy", "CreatedDate")
SELECT m."Id", actions."Code", actions."Name", 'System', now()
FROM "CORE_Menu" m
CROSS JOIN (VALUES
  ('service-requests.create', 'Create request'),
  ('service-requests.review', 'Review request'),
  ('service-requests.comment', 'Comment')
) AS actions("Code", "Name")
WHERE m."Code" = 'service-requests'
ON CONFLICT ("Code") DO NOTHING;

INSERT INTO "CORE_RoleMenu" ("RoleId", "MenuId", "CreatedBy", "CreatedDate")
SELECT rm."RoleId", target."Id", 'System', now()
FROM "CORE_RoleMenu" rm
JOIN "CORE_Menu" existing ON existing."Id" = rm."MenuId" AND existing."Code" = 'issues'
CROSS JOIN "CORE_Menu" target
WHERE target."Code" = 'service-requests'
ON CONFLICT ("RoleId", "MenuId") DO NOTHING;

INSERT INTO "CORE_RoleMenuAction" ("RoleId", "MenuActionId", "CreatedBy", "CreatedDate")
SELECT ra."RoleId", targetAction."Id", 'System', now()
FROM "CORE_RoleMenuAction" ra
JOIN "CORE_MenuAction" existingAction ON existingAction."Id" = ra."MenuActionId"
JOIN "CORE_Menu" existingMenu ON existingMenu."Id" = existingAction."MenuId" AND existingMenu."Code" = 'issues'
JOIN "CORE_MenuAction" targetAction ON targetAction."Code" = CASE existingAction."Code"
  WHEN 'issues.create' THEN 'service-requests.create'
  WHEN 'issues.edit' THEN 'service-requests.review'
  WHEN 'issues.comment' THEN 'service-requests.comment'
END
ON CONFLICT ("RoleId", "MenuActionId") DO NOTHING;
