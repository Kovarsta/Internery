CREATE TYPE "public"."time_of_day" AS ENUM('MORNING', 'AFTERNOON', 'EVENING');--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "availableDays" "day_of_week"[] DEFAULT ARRAY[]::day_of_week[] NOT NULL;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "availableTimeOfDay" time_of_day[] DEFAULT ARRAY[]::time_of_day[] NOT NULL;