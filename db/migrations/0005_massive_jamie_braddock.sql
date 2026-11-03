CREATE TABLE "DATA_ProjectEnvironments" (
	"Id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "DATA_ProjectEnvironments_Id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"ProjectId" integer NOT NULL,
	"Environment" varchar(50) NOT NULL,
	"Url" varchar(500) NOT NULL,
	"IsActive" boolean DEFAULT true NOT NULL,
	"CreatedBy" varchar(100),
	"CreatedDate" timestamp DEFAULT now() NOT NULL,
	"UpdatedBy" varchar(100),
	"UpdatedDate" timestamp
);
--> statement-breakpoint
CREATE TABLE "DATA_ProjectPhases" (
	"Id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "DATA_ProjectPhases_Id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"ProjectId" integer NOT NULL,
	"Name" varchar(100) NOT NULL,
	"StartDate" date NOT NULL,
	"EndDate" date NOT NULL,
	"Sequence" integer DEFAULT 0 NOT NULL,
	"IsActive" boolean DEFAULT true NOT NULL,
	"CreatedBy" varchar(100),
	"CreatedDate" timestamp DEFAULT now() NOT NULL,
	"UpdatedBy" varchar(100),
	"UpdatedDate" timestamp
);
--> statement-breakpoint
CREATE TABLE "DATA_ProjectRepositories" (
	"Id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "DATA_ProjectRepositories_Id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"ProjectId" integer NOT NULL,
	"Url" varchar(255) NOT NULL,
	"Sequence" integer DEFAULT 0 NOT NULL,
	"IsActive" boolean DEFAULT true NOT NULL,
	"CreatedBy" varchar(100),
	"CreatedDate" timestamp DEFAULT now() NOT NULL,
	"UpdatedBy" varchar(100),
	"UpdatedDate" timestamp
);
--> statement-breakpoint
CREATE TABLE "DATA_ProjectTags" (
	"Id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "DATA_ProjectTags_Id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"ProjectId" integer NOT NULL,
	"CategoryId" integer NOT NULL,
	"IsActive" boolean DEFAULT true NOT NULL,
	"CreatedBy" varchar(100),
	"CreatedDate" timestamp DEFAULT now() NOT NULL,
	"UpdatedBy" varchar(100),
	"UpdatedDate" timestamp
);
--> statement-breakpoint
CREATE TABLE "DATA_Projects" (
	"Id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "DATA_Projects_Id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"NewId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"Name" varchar(150) NOT NULL,
	"OwnerId" integer NOT NULL,
	"Description" text DEFAULT '' NOT NULL,
	"GoLiveDate" date,
	"IsActive" boolean DEFAULT true NOT NULL,
	"CreatedBy" varchar(100),
	"CreatedDate" timestamp DEFAULT now() NOT NULL,
	"UpdatedBy" varchar(100),
	"UpdatedDate" timestamp,
	CONSTRAINT "DATA_Projects_NewId_unique" UNIQUE("NewId")
);
--> statement-breakpoint
ALTER TABLE "DATA_ProjectEnvironments" ADD CONSTRAINT "DATA_ProjectEnvironments_ProjectId_DATA_Projects_Id_fk" FOREIGN KEY ("ProjectId") REFERENCES "public"."DATA_Projects"("Id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DATA_ProjectPhases" ADD CONSTRAINT "DATA_ProjectPhases_ProjectId_DATA_Projects_Id_fk" FOREIGN KEY ("ProjectId") REFERENCES "public"."DATA_Projects"("Id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DATA_ProjectRepositories" ADD CONSTRAINT "DATA_ProjectRepositories_ProjectId_DATA_Projects_Id_fk" FOREIGN KEY ("ProjectId") REFERENCES "public"."DATA_Projects"("Id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DATA_ProjectTags" ADD CONSTRAINT "DATA_ProjectTags_ProjectId_DATA_Projects_Id_fk" FOREIGN KEY ("ProjectId") REFERENCES "public"."DATA_Projects"("Id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DATA_ProjectTags" ADD CONSTRAINT "DATA_ProjectTags_CategoryId_CORE_Category_Id_fk" FOREIGN KEY ("CategoryId") REFERENCES "public"."CORE_Category"("Id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DATA_Projects" ADD CONSTRAINT "DATA_Projects_OwnerId_CORE_User_Id_fk" FOREIGN KEY ("OwnerId") REFERENCES "public"."CORE_User"("Id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "DATA_ProjectEnvironments_ProjectId_Environment_key" ON "DATA_ProjectEnvironments" USING btree ("ProjectId","Environment");--> statement-breakpoint
CREATE UNIQUE INDEX "DATA_ProjectTags_ProjectId_CategoryId_key" ON "DATA_ProjectTags" USING btree ("ProjectId","CategoryId");--> statement-breakpoint
CREATE UNIQUE INDEX "DATA_Projects_Name_key" ON "DATA_Projects" USING btree ("Name");