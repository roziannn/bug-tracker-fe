CREATE TABLE "DATA_DatabaseMonitorSamples" (
	"Id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "DATA_DatabaseMonitorSamples_Id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"ServerKey" varchar(100) NOT NULL,
	"Status" varchar(10) NOT NULL,
	"LatencyMs" integer,
	"CheckedDate" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "DATA_DatabaseMonitorSamples_ServerKey_CheckedDate_idx" ON "DATA_DatabaseMonitorSamples" USING btree ("ServerKey","CheckedDate");