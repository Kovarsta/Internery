ALTER TABLE "student_profiles" ADD COLUMN "digestEnabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "digestLastSentAt" timestamp with time zone;