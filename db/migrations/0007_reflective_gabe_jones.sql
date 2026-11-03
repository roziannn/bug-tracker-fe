CREATE TABLE "CORE_Team" (
	"Id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "CORE_Team_Id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"NewId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"DomainId" integer NOT NULL,
	"LeadId" integer NOT NULL,
	"IsActive" boolean DEFAULT true NOT NULL,
	"CreatedBy" varchar(100),
	"CreatedDate" timestamp DEFAULT now() NOT NULL,
	"UpdatedBy" varchar(100),
	"UpdatedDate" timestamp,
	CONSTRAINT "CORE_Team_NewId_unique" UNIQUE("NewId"),
	CONSTRAINT "CORE_Team_DomainId_unique" UNIQUE("DomainId")
);
--> statement-breakpoint
CREATE TABLE "CORE_TeamMember" (
	"Id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "CORE_TeamMember_Id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"TeamId" integer NOT NULL,
	"UserId" integer NOT NULL,
	"Role" varchar(20) DEFAULT 'Engineer' NOT NULL,
	"AccessLevel" varchar(20) DEFAULT 'member' NOT NULL,
	"IsActive" boolean DEFAULT true NOT NULL,
	"CreatedBy" varchar(100),
	"CreatedDate" timestamp DEFAULT now() NOT NULL,
	"UpdatedBy" varchar(100),
	"UpdatedDate" timestamp
);
--> statement-breakpoint
ALTER TABLE "CORE_Team" ADD CONSTRAINT "CORE_Team_DomainId_CORE_Category_Id_fk" FOREIGN KEY ("DomainId") REFERENCES "public"."CORE_Category"("Id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CORE_Team" ADD CONSTRAINT "CORE_Team_LeadId_CORE_User_Id_fk" FOREIGN KEY ("LeadId") REFERENCES "public"."CORE_User"("Id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CORE_TeamMember" ADD CONSTRAINT "CORE_TeamMember_TeamId_CORE_Team_Id_fk" FOREIGN KEY ("TeamId") REFERENCES "public"."CORE_Team"("Id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CORE_TeamMember" ADD CONSTRAINT "CORE_TeamMember_UserId_CORE_User_Id_fk" FOREIGN KEY ("UserId") REFERENCES "public"."CORE_User"("Id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "CORE_TeamMember_TeamId_UserId_key" ON "CORE_TeamMember" USING btree ("TeamId","UserId");