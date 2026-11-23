UPDATE "CORE_Menu"
SET "Path" = '/service-requests', "UpdatedDate" = now()
WHERE "Code" = 'service-requests'
  AND "Path" <> '/service-requests';
