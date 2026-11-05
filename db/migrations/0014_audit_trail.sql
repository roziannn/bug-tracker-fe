CREATE TABLE IF NOT EXISTS "DATA_AuditTrail" (
  "Id" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "Actor" varchar(255) NOT NULL DEFAULT 'System',
  "Action" varchar(100) NOT NULL,
  "TargetType" varchar(100) NOT NULL,
  "TargetName" varchar(255) NOT NULL,
  "Detail" text NOT NULL DEFAULT '',
  "Outcome" varchar(20) NOT NULL DEFAULT 'Success',
  "CreatedDate" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE OR REPLACE FUNCTION "fn_DATA_AuditTrail_capture"() RETURNS trigger AS $$
DECLARE
  old_row jsonb;
  new_row jsonb;
  actor_name text;
  target_name text;
  action_name text;
BEGIN
  old_row := CASE WHEN TG_OP = 'INSERT' THEN '{}'::jsonb ELSE to_jsonb(OLD) END;
  new_row := CASE WHEN TG_OP = 'DELETE' THEN '{}'::jsonb ELSE to_jsonb(NEW) END;
  actor_name := COALESCE(NULLIF(new_row->>'UpdatedBy', ''), NULLIF(new_row->>'CreatedBy', ''), NULLIF(old_row->>'UpdatedBy', ''), NULLIF(old_row->>'CreatedBy', ''), 'System');
  target_name := COALESCE(NULLIF(new_row->>'Name', ''), NULLIF(new_row->>'Title', ''), NULLIF(new_row->>'Key', ''), NULLIF(new_row->>'Email', ''), NULLIF(new_row->>'Code', ''), new_row->>'Id', old_row->>'Id', 'record');
  action_name := CASE TG_OP WHEN 'INSERT' THEN 'Created' WHEN 'DELETE' THEN 'Deleted' ELSE 'Updated' END;
  INSERT INTO "DATA_AuditTrail" ("Actor", "Action", "TargetType", "TargetName", "Detail", "CreatedDate")
  VALUES (actor_name, action_name, TG_TABLE_NAME, target_name, action_name || ' ' || TG_TABLE_NAME, now());
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'DATA_Issues', 'DATA_IssueComments', 'DATA_IssueActivity', 'DATA_Projects', 'DATA_ProjectPhases',
    'DATA_ProjectTags', 'DATA_ProjectRepositories', 'DATA_ProjectEnvironments', 'DATA_Kanban',
    'CORE_Team', 'CORE_TeamMember', 'CORE_User', 'CORE_Role', 'CORE_RoleClaim', 'CORE_Menu',
    'CORE_MenuAction', 'CORE_RoleMenu', 'CORE_RoleMenuAction', 'CORE_Env', 'CORE_Category'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS data_audit_trail_capture ON %I', table_name);
    EXECUTE format('CREATE TRIGGER data_audit_trail_capture AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION "fn_DATA_AuditTrail_capture"()', table_name);
  END LOOP;
END $$;
