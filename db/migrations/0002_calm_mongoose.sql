CREATE TABLE "CORE_RoleMenu" (
	"Id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "CORE_RoleMenu_Id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"RoleId" integer NOT NULL,
	"MenuId" integer NOT NULL,
	"IsActive" boolean DEFAULT true NOT NULL,
	"CreatedBy" varchar(100),
	"CreatedDate" timestamp DEFAULT now() NOT NULL,
	"UpdatedBy" varchar(100),
	"UpdatedDate" timestamp
);
--> statement-breakpoint
CREATE TABLE "CORE_RoleMenuAction" (
	"Id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "CORE_RoleMenuAction_Id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"RoleId" integer NOT NULL,
	"MenuActionId" integer NOT NULL,
	"IsActive" boolean DEFAULT true NOT NULL,
	"CreatedBy" varchar(100),
	"CreatedDate" timestamp DEFAULT now() NOT NULL,
	"UpdatedBy" varchar(100),
	"UpdatedDate" timestamp
);
--> statement-breakpoint
ALTER TABLE "CORE_RoleMenu" ADD CONSTRAINT "CORE_RoleMenu_RoleId_CORE_Role_Id_fk" FOREIGN KEY ("RoleId") REFERENCES "public"."CORE_Role"("Id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CORE_RoleMenu" ADD CONSTRAINT "CORE_RoleMenu_MenuId_CORE_Menu_Id_fk" FOREIGN KEY ("MenuId") REFERENCES "public"."CORE_Menu"("Id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CORE_RoleMenuAction" ADD CONSTRAINT "CORE_RoleMenuAction_RoleId_CORE_Role_Id_fk" FOREIGN KEY ("RoleId") REFERENCES "public"."CORE_Role"("Id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CORE_RoleMenuAction" ADD CONSTRAINT "CORE_RoleMenuAction_MenuActionId_CORE_MenuAction_Id_fk" FOREIGN KEY ("MenuActionId") REFERENCES "public"."CORE_MenuAction"("Id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "CORE_RoleMenu_RoleId_MenuId_key" ON "CORE_RoleMenu" USING btree ("RoleId","MenuId");--> statement-breakpoint
CREATE UNIQUE INDEX "CORE_RoleMenuAction_RoleId_MenuActionId_key" ON "CORE_RoleMenuAction" USING btree ("RoleId","MenuActionId");