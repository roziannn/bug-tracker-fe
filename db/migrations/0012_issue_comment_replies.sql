ALTER TABLE "DATA_IssueComments"
  ADD COLUMN "ParentCommentId" integer REFERENCES "DATA_IssueComments"("Id") ON DELETE CASCADE;

CREATE INDEX "IDX_DATA_IssueComments_ParentCommentId"
  ON "DATA_IssueComments" ("ParentCommentId");
