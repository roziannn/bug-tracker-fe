CREATE TABLE "CORE_Env" (
	"Id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "CORE_Env_Id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"Environment" varchar(50) NOT NULL,
	"Label" varchar(100) NOT NULL,
	"Key" varchar(100) NOT NULL,
	"Value" text DEFAULT '' NOT NULL,
	"IsSecret" boolean DEFAULT false NOT NULL,
	"IsActive" boolean DEFAULT true NOT NULL,
	"CreatedBy" varchar(100),
	"CreatedDate" timestamp DEFAULT now() NOT NULL,
	"UpdatedBy" varchar(100),
	"UpdatedDate" timestamp
);
--> statement-breakpoint
CREATE UNIQUE INDEX "CORE_Env_Environment_Key_key" ON "CORE_Env" USING btree ("Environment","Key");