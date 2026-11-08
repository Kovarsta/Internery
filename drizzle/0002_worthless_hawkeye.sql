CREATE TYPE "public"."day_of_week" AS ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "daysOfWeek" "day_of_week"[] NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "startTime" time NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "endTime" time NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "scheduleNote" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_schedule_days_chk" CHECK (cardinality("jobs"."daysOfWeek") > 0);--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_schedule_times_chk" CHECK ("jobs"."startTime" < "jobs"."endTime");