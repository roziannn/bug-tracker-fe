CREATE TABLE "CORE_Category" (
	"Id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "CORE_Category_Id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"CategoryName" varchar(100) NOT NULL,
	"Name" varchar(100) NOT NULL,
	"Description" varchar(255) DEFAULT '' NOT NULL,
	"IsActive" boolean DEFAULT true NOT NULL,
	"CreatedBy" varchar(100),
	"CreatedDate" timestamp DEFAULT now() NOT NULL,
	"UpdatedBy" varchar(100),
	"UpdatedDate" timestamp
);
--> statement-breakpoint
CREATE UNIQUE INDEX "CORE_Category_CategoryName_Name_key" ON "CORE_Category" USING btree ("CategoryName","Name");