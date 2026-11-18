ALTER TABLE "CORE_DatabaseServer"
  DROP COLUMN IF EXISTS "AccountNote",
  ADD COLUMN IF NOT EXISTS "LoginMethod" varchar(30) DEFAULT 'email' NOT NULL,
  ADD COLUMN IF NOT EXISTS "LoginAccount" varchar(255) DEFAULT '' NOT NULL;
