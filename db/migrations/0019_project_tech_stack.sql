ALTER TABLE "DATA_Projects"
ADD COLUMN "TechStack" jsonb NOT NULL DEFAULT '[]'::jsonb;
