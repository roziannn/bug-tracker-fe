CREATE TABLE "CORE_Role" (
	"Id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "CORE_Role_Id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"NewId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"Name" varchar(100) NOT NULL,
	"IsActive" boolean DEFAULT true NOT NULL,
	"CreatedBy" varchar(100),
	"CreatedDate" timestamp DEFAULT now() NOT NULL,
	"UpdatedBy" varchar(100),
	"UpdatedDate" timestamp,
	CONSTRAINT "CORE_Role_NewId_unique" UNIQUE("NewId"),
	CONSTRAINT "CORE_Role_Name_unique" UNIQUE("Name")
);
--> statement-breakpoint
CREATE TABLE "CORE_RoleClaim" (
	"Id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "CORE_RoleClaim_Id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"RoleId" integer NOT NULL,
	"Name" varchar(150) NOT NULL,
	"Email" varchar(255) NOT NULL,
	"IsActive" boolean DEFAULT true NOT NULL,
	"CreatedBy" varchar(100),
	"CreatedDate" timestamp DEFAULT now() NOT NULL,
	"UpdatedBy" varchar(100),
	"UpdatedDate" timestamp
);
--> statement-breakpoint
CREATE TABLE "CORE_User" (
	"Id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "CORE_User_Id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"Name" varchar(150) NOT NULL,
	"Email" varchar(255) NOT NULL,
	"Password" varchar(255) NOT NULL,
	"IsActive" boolean DEFAULT true NOT NULL,
	"CreatedBy" varchar(100),
	"CreatedDate" timestamp DEFAULT now() NOT NULL,
	"UpdatedBy" varchar(100),
	"UpdatedDate" timestamp
);
--> statement-breakpoint
ALTER TABLE "CORE_RoleClaim" ADD CONSTRAINT "CORE_RoleClaim_RoleId_CORE_Role_Id_fk" FOREIGN KEY ("RoleId") REFERENCES "public"."CORE_Role"("Id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "CORE_User_Email_key" ON "CORE_User" USING btree ("Email");