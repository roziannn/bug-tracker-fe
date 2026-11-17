CREATE TABLE "CORE_DatabaseServer" (
  "Id" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "NewId" uuid NOT NULL DEFAULT gen_random_uuid(),
  "Name" varchar(100) NOT NULL,
  "Provider" varchar(30) NOT NULL,
  "ConnectionSecret" text NOT NULL,
  "IsActive" boolean NOT NULL DEFAULT true,
  "CreatedBy" varchar(100),
  "CreatedDate" timestamp NOT NULL DEFAULT now(),
  "UpdatedBy" varchar(100),
  "UpdatedDate" timestamp,
  CONSTRAINT "CORE_DatabaseServer_NewId_unique" UNIQUE ("NewId")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "CORE_DatabaseServer_Name_key" ON "CORE_DatabaseServer" USING btree ("Name");

INSERT INTO "CORE_Menu" ("Code", "Name", "Path", "Icon", "ParentId", "Sequence", "IsVisible", "CreatedBy", "CreatedDate")
SELECT 'settings-database-monitor', 'Database Monitor', '/settings/database-monitor', 'Database', parent."Id",
       COALESCE((SELECT MAX("Sequence") + 1 FROM "CORE_Menu"), 0), true, 'System', now()
FROM "CORE_Menu" parent
WHERE parent."Code" = 'settings'
ON CONFLICT ("Code") DO NOTHING;

INSERT INTO "CORE_RoleMenu" ("RoleId", "MenuId", "CreatedBy", "CreatedDate")
SELECT access."RoleId", target."Id", 'System', now()
FROM "CORE_RoleMenu" access
JOIN "CORE_Menu" parent ON parent."Id" = access."MenuId" AND parent."Code" = 'settings'
CROSS JOIN "CORE_Menu" target
WHERE target."Code" = 'settings-database-monitor'
ON CONFLICT ("RoleId", "MenuId") DO NOTHING;
