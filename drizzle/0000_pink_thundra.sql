CREATE TYPE "public"."ai_verdict" AS ENUM('FIT', 'MAYBE_FIT');--> statement-breakpoint
CREATE TYPE "public"."application_status" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');--> statement-breakpoint
CREATE TYPE "public"."employer_verification" AS ENUM('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('HIRING', 'FILLED', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('APPLICATION_RECEIVED', 'APPLICATION_WITHDRAWN', 'APPLICATION_ACCEPTED', 'APPLICATION_REJECTED', 'JOB_FILLED', 'JOB_COMPLETED', 'JOB_CANCELLED', 'JOB_HIDDEN', 'JOB_AUTO_HIDDEN', 'VERIFICATION_APPROVED', 'VERIFICATION_REJECTED', 'REVIEW_RECEIVED', 'WORK_RECORD_CREATED');--> statement-breakpoint
CREATE TYPE "public"."org_type" AS ENUM('COMPANY', 'INDIVIDUAL');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('OPEN', 'RESOLVED');--> statement-breakpoint
CREATE TYPE "public"."salary_type" AS ENUM('HOURLY', 'DAILY', 'FIXED');--> statement-breakpoint
CREATE TYPE "public"."verification_request_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"role" text DEFAULT 'STUDENT' NOT NULL,
	"status" text DEFAULT 'PENDING_VERIFICATION' NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_consents" (
	"studentId" uuid PRIMARY KEY NOT NULL,
	"consentedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"withdrawnAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ai_explanations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"studentId" uuid NOT NULL,
	"jobId" uuid NOT NULL,
	"cvHash" varchar(64) NOT NULL,
	"verdict" "ai_verdict" NOT NULL,
	"reasons" jsonb NOT NULL,
	"gaps" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"model" varchar(100) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_explanations_uq" UNIQUE("studentId","jobId","cvHash")
);
--> statement-breakpoint
CREATE TABLE "ai_usage" (
	"userId" uuid NOT NULL,
	"day" date NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "ai_usage_userId_day_pk" PRIMARY KEY("userId","day"),
	CONSTRAINT "ai_usage_count_chk" CHECK ("ai_usage"."count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jobId" uuid NOT NULL,
	"studentId" uuid NOT NULL,
	"message" varchar(1000),
	"cvKey" text,
	"cvFileName" varchar(255),
	"status" "application_status" DEFAULT 'PENDING' NOT NULL,
	"rejectReason" varchar(500),
	"decidedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applications_job_student_uq" UNIQUE("jobId","studentId")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actorId" uuid,
	"action" varchar(60) NOT NULL,
	"targetType" varchar(40) NOT NULL,
	"targetId" uuid NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employer_profiles" (
	"userId" uuid PRIMARY KEY NOT NULL,
	"orgName" varchar(200) NOT NULL,
	"orgType" "org_type" DEFAULT 'INDIVIDUAL' NOT NULL,
	"description" text,
	"address" varchar(300),
	"contactPhone" varchar(20),
	"verificationStatus" "employer_verification" DEFAULT 'UNVERIFIED' NOT NULL,
	"verifiedAt" timestamp with time zone,
	"ratingAvg" numeric(3, 2) DEFAULT 0 NOT NULL,
	"ratingCount" integer DEFAULT 0 NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employer_rating_chk" CHECK ("employer_profiles"."ratingAvg" BETWEEN 0 AND 5)
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employerId" uuid NOT NULL,
	"categoryId" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"location" varchar(300) NOT NULL,
	"schedule" text NOT NULL,
	"salaryAmount" integer NOT NULL,
	"salaryType" "salary_type" NOT NULL,
	"startDate" date NOT NULL,
	"endDate" date NOT NULL,
	"positionsNeeded" integer DEFAULT 1 NOT NULL,
	"status" "job_status" DEFAULT 'HIRING' NOT NULL,
	"isHidden" boolean DEFAULT false NOT NULL,
	"hiddenReason" varchar(500),
	"hiddenBy" uuid,
	"hiddenAt" timestamp with time zone,
	"needsReview" boolean DEFAULT false NOT NULL,
	"flaggedTerms" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"completedAt" timestamp with time zone,
	"cancelledAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "jobs_positions_chk" CHECK ("jobs"."positionsNeeded" >= 1),
	CONSTRAINT "jobs_salary_chk" CHECK ("jobs"."salaryAmount" > 0),
	CONSTRAINT "jobs_dates_chk" CHECK ("jobs"."endDate" > "jobs"."startDate")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(200) NOT NULL,
	"body" text,
	"jobId" uuid,
	"applicationId" uuid,
	"readAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jobId" uuid NOT NULL,
	"reporterId" uuid NOT NULL,
	"reason" varchar(500) NOT NULL,
	"status" "report_status" DEFAULT 'OPEN' NOT NULL,
	"resolvedBy" uuid,
	"resolvedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reports_job_reporter_uq" UNIQUE("jobId","reporterId")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jobId" uuid NOT NULL,
	"reviewerId" uuid NOT NULL,
	"revieweeId" uuid NOT NULL,
	"rating" smallint NOT NULL,
	"comment" varchar(500),
	"isHidden" boolean DEFAULT false NOT NULL,
	"hiddenBy" uuid,
	"hiddenAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_job_reviewer_reviewee_uq" UNIQUE("jobId","reviewerId","revieweeId"),
	CONSTRAINT "reviews_rating_chk" CHECK ("reviews"."rating" BETWEEN 1 AND 5),
	CONSTRAINT "reviews_not_self_chk" CHECK ("reviews"."reviewerId" <> "reviews"."revieweeId")
);
--> statement-breakpoint
CREATE TABLE "saved_jobs" (
	"userId" uuid NOT NULL,
	"jobId" uuid NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_jobs_userId_jobId_pk" PRIMARY KEY("userId","jobId")
);
--> statement-breakpoint
CREATE TABLE "student_profiles" (
	"userId" uuid PRIMARY KEY NOT NULL,
	"university" varchar(160),
	"major" varchar(160),
	"skills" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"availability" text,
	"bio" text,
	"cvKey" text,
	"cvFileName" varchar(255),
	"cvMimeType" varchar(100),
	"cvSizeBytes" integer,
	"ratingAvg" numeric(3, 2) DEFAULT 0 NOT NULL,
	"ratingCount" integer DEFAULT 0 NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "student_cv_size_chk" CHECK ("student_profiles"."cvSizeBytes" IS NULL OR "student_profiles"."cvSizeBytes" BETWEEN 1 AND 5242880),
	CONSTRAINT "student_cv_all_or_none_chk" CHECK (("student_profiles"."cvKey" IS NULL) = ("student_profiles"."cvFileName" IS NULL)),
	CONSTRAINT "student_rating_chk" CHECK ("student_profiles"."ratingAvg" BETWEEN 0 AND 5)
);
--> statement-breakpoint
CREATE TABLE "user_moderation" (
	"userId" uuid PRIMARY KEY NOT NULL,
	"failedLoginCount" integer DEFAULT 0 NOT NULL,
	"lockedUntil" timestamp with time zone,
	"lockedAt" timestamp with time zone,
	"lockedBy" uuid,
	"lockReason" varchar(500),
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_moderation_failed_login_chk" CHECK ("user_moderation"."failedLoginCount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"userId" uuid PRIMARY KEY NOT NULL,
	"phone" varchar(20),
	"avatarKey" text,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employerId" uuid NOT NULL,
	"orgName" varchar(200) NOT NULL,
	"websiteUrl" varchar(500),
	"contactInfo" varchar(300) NOT NULL,
	"licenseKey" text,
	"status" "verification_request_status" DEFAULT 'PENDING' NOT NULL,
	"rejectReason" varchar(500),
	"reviewedBy" uuid,
	"reviewedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jobId" uuid NOT NULL,
	"studentId" uuid NOT NULL,
	"employerId" uuid NOT NULL,
	"reviewId" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"signature" text NOT NULL,
	"signatureVersion" smallint DEFAULT 1 NOT NULL,
	"isPublic" boolean DEFAULT false NOT NULL,
	"publishedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "work_records_job_student_uq" UNIQUE("jobId","studentId"),
	CONSTRAINT "work_records_public_chk" CHECK (NOT "work_records"."isPublic" OR "work_records"."publishedAt" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_consents" ADD CONSTRAINT "ai_consents_studentId_users_id_fk" FOREIGN KEY ("studentId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_explanations" ADD CONSTRAINT "ai_explanations_studentId_users_id_fk" FOREIGN KEY ("studentId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_explanations" ADD CONSTRAINT "ai_explanations_jobId_jobs_id_fk" FOREIGN KEY ("jobId") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_jobId_jobs_id_fk" FOREIGN KEY ("jobId") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_studentId_users_id_fk" FOREIGN KEY ("studentId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_users_id_fk" FOREIGN KEY ("actorId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employer_profiles" ADD CONSTRAINT "employer_profiles_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_employerId_users_id_fk" FOREIGN KEY ("employerId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_categoryId_categories_id_fk" FOREIGN KEY ("categoryId") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_hiddenBy_users_id_fk" FOREIGN KEY ("hiddenBy") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_jobId_jobs_id_fk" FOREIGN KEY ("jobId") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_applicationId_applications_id_fk" FOREIGN KEY ("applicationId") REFERENCES "public"."applications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_jobId_jobs_id_fk" FOREIGN KEY ("jobId") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporterId_users_id_fk" FOREIGN KEY ("reporterId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_resolvedBy_users_id_fk" FOREIGN KEY ("resolvedBy") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_jobId_jobs_id_fk" FOREIGN KEY ("jobId") REFERENCES "public"."jobs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewerId_users_id_fk" FOREIGN KEY ("reviewerId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_revieweeId_users_id_fk" FOREIGN KEY ("revieweeId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_hiddenBy_users_id_fk" FOREIGN KEY ("hiddenBy") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_jobs" ADD CONSTRAINT "saved_jobs_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_jobs" ADD CONSTRAINT "saved_jobs_jobId_jobs_id_fk" FOREIGN KEY ("jobId") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_moderation" ADD CONSTRAINT "user_moderation_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_moderation" ADD CONSTRAINT "user_moderation_lockedBy_users_id_fk" FOREIGN KEY ("lockedBy") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_employerId_users_id_fk" FOREIGN KEY ("employerId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_reviewedBy_users_id_fk" FOREIGN KEY ("reviewedBy") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_records" ADD CONSTRAINT "work_records_jobId_jobs_id_fk" FOREIGN KEY ("jobId") REFERENCES "public"."jobs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_records" ADD CONSTRAINT "work_records_studentId_users_id_fk" FOREIGN KEY ("studentId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_records" ADD CONSTRAINT "work_records_employerId_users_id_fk" FOREIGN KEY ("employerId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_records" ADD CONSTRAINT "work_records_reviewId_reviews_id_fk" FOREIGN KEY ("reviewId") REFERENCES "public"."reviews"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_userId_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_userId_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "applications_student_idx" ON "applications" USING btree ("studentId","createdAt" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "applications_job_status_idx" ON "applications" USING btree ("jobId","status");--> statement-breakpoint
CREATE INDEX "audit_target_idx" ON "audit_logs" USING btree ("targetType","targetId");--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_logs" USING btree ("createdAt" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "categories_name_lower_uq" ON "categories" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "employer_verification_idx" ON "employer_profiles" USING btree ("verificationStatus");--> statement-breakpoint
CREATE INDEX "jobs_fts_idx" ON "jobs" USING gin (to_tsvector('simple', "title" || ' ' || "description"));--> statement-breakpoint
CREATE INDEX "jobs_open_listing_idx" ON "jobs" USING btree ("createdAt" DESC NULLS LAST) WHERE "jobs"."status" = 'HIRING' AND NOT "jobs"."isHidden";--> statement-breakpoint
CREATE INDEX "jobs_open_salary_idx" ON "jobs" USING btree ("salaryAmount") WHERE "jobs"."status" = 'HIRING' AND NOT "jobs"."isHidden";--> statement-breakpoint
CREATE INDEX "jobs_category_idx" ON "jobs" USING btree ("categoryId");--> statement-breakpoint
CREATE INDEX "jobs_employer_status_idx" ON "jobs" USING btree ("employerId","status");--> statement-breakpoint
CREATE INDEX "jobs_needs_review_idx" ON "jobs" USING btree ("createdAt") WHERE "jobs"."needsReview" OR "jobs"."isHidden";--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("userId","createdAt" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "notifications_unread_idx" ON "notifications" USING btree ("userId") WHERE "notifications"."readAt" IS NULL;--> statement-breakpoint
CREATE INDEX "reports_job_status_idx" ON "reports" USING btree ("jobId","status");--> statement-breakpoint
CREATE INDEX "reviews_reviewee_idx" ON "reviews" USING btree ("revieweeId","createdAt" DESC NULLS LAST) WHERE NOT "reviews"."isHidden";--> statement-breakpoint
CREATE UNIQUE INDEX "verification_one_pending_uq" ON "verification_requests" USING btree ("employerId") WHERE "verification_requests"."status" = 'PENDING';--> statement-breakpoint
CREATE INDEX "verification_status_idx" ON "verification_requests" USING btree ("status","createdAt");--> statement-breakpoint
CREATE INDEX "work_records_student_idx" ON "work_records" USING btree ("studentId","createdAt" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "work_records_directory_idx" ON "work_records" USING btree ("publishedAt" DESC NULLS LAST) WHERE "work_records"."isPublic";