ALTER TABLE "user_profiles" ADD COLUMN "onboardedAt" timestamp with time zone;--> statement-breakpoint
UPDATE "user_profiles" SET "onboardedAt" = now() WHERE "onboardedAt" IS NULL;