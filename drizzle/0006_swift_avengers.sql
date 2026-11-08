UPDATE "jobs" SET "locationId" = "locations"."id" FROM "locations" WHERE "locations"."name" = "jobs"."location";--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "locationId" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" DROP COLUMN "location";