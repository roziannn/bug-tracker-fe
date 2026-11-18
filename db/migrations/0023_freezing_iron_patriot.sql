CREATE TABLE "DATA_Notifications" (
	"Id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "DATA_Notifications_Id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"UserId" integer NOT NULL,
	"IssueId" varchar(100) NOT NULL,
	"Title" varchar(255) NOT NULL,
	"Description" text DEFAULT '' NOT NULL,
	"Href" varchar(500) NOT NULL,
	"IsRead" boolean DEFAULT false NOT NULL,
	"CreatedDate" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "DATA_Notifications" ADD CONSTRAINT "DATA_Notifications_UserId_CORE_User_Id_fk" FOREIGN KEY ("UserId") REFERENCES "public"."CORE_User"("Id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "DATA_Notifications_UserId_CreatedDate_idx" ON "DATA_Notifications" USING btree ("UserId", "CreatedDate");
