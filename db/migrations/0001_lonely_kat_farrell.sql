CREATE TABLE "CORE_Menu" (
	"Id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "CORE_Menu_Id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"Code" varchar(150) NOT NULL,
	"Name" varchar(100) NOT NULL,
	"Path" varchar(255) DEFAULT '' NOT NULL,
	"Icon" varchar(50) DEFAULT 'Circle' NOT NULL,
	"ParentId" integer,
	"Sequence" integer DEFAULT 0 NOT NULL,
	"IsVisible" boolean DEFAULT true NOT NULL,
	"IsActive" boolean DEFAULT true NOT NULL,
	"CreatedBy" varchar(100),
	"CreatedDate" timestamp DEFAULT now() NOT NULL,
	"UpdatedBy" varchar(100),
	"UpdatedDate" timestamp,
	CONSTRAINT "CORE_Menu_Code_unique" UNIQUE("Code")
);
--> statement-breakpoint
CREATE TABLE "CORE_MenuAction" (
	"Id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "CORE_MenuAction_Id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"MenuId" integer NOT NULL,
	"Code" varchar(200) NOT NULL,
	"Name" varchar(100) NOT NULL,
	"IsActive" boolean DEFAULT true NOT NULL,
	"CreatedBy" varchar(100),
	"CreatedDate" timestamp DEFAULT now() NOT NULL,
	"UpdatedBy" varchar(100),
	"UpdatedDate" timestamp,
	CONSTRAINT "CORE_MenuAction_Code_unique" UNIQUE("Code")
);
--> statement-breakpoint
ALTER TABLE "CORE_Menu" ADD CONSTRAINT "CORE_Menu_ParentId_CORE_Menu_Id_fk" FOREIGN KEY ("ParentId") REFERENCES "public"."CORE_Menu"("Id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CORE_MenuAction" ADD CONSTRAINT "CORE_MenuAction_MenuId_CORE_Menu_Id_fk" FOREIGN KEY ("MenuId") REFERENCES "public"."CORE_Menu"("Id") ON DELETE cascade ON UPDATE no action;