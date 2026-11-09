ALTER TYPE "public"."job_status" ADD VALUE 'CLOSED' BEFORE 'FILLED';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'JOB_CLOSED' BEFORE 'JOB_COMPLETED';