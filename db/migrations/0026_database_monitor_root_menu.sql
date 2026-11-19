UPDATE "CORE_Menu"
SET "Path" = '/database-monitor', "ParentId" = NULL, "UpdatedDate" = now()
WHERE "Code" = 'settings-database-monitor';
