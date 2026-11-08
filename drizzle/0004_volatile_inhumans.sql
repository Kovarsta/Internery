CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"countryCode" varchar(2) NOT NULL,
	"countryName" varchar(80) NOT NULL,
	"name" varchar(160) NOT NULL,
	"displayName" varchar(220) NOT NULL,
	"slug" varchar(200) NOT NULL,
	"adminArea" varchar(160),
	"aliases" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"searchText" text NOT NULL,
	"isRemote" boolean DEFAULT false NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "locations_country_slug_uq" UNIQUE("countryCode","slug")
);
--> statement-breakpoint
CREATE INDEX "locations_search_idx" ON "locations" USING gin ("searchText" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "locations_country_name_idx" ON "locations" USING btree ("countryCode","name") WHERE "locations"."isActive";--> statement-breakpoint
INSERT INTO "locations" ("id", "countryCode", "countryName", "name", "displayName", "slug", "aliases", "searchText", "isRemote") VALUES
	('80000000-0000-4000-8000-000000000001', 'VN', 'Vietnam', 'Hanoi', 'Hanoi, Vietnam', 'hanoi', ARRAY['Ha Noi', 'Hà Nội', 'HN'], 'hanoi vietnam ha noi hn', false),
	('80000000-0000-4000-8000-000000000002', 'VN', 'Vietnam', 'Ho Chi Minh City', 'Ho Chi Minh City, Vietnam', 'ho-chi-minh-city', ARRAY['HCM', 'HCMC', 'TPHCM', 'TP.HCM', 'Ho Chi Minh', 'Saigon', 'Sai Gon', 'Sài Gòn'], 'ho chi minh city vietnam hcm hcmc tphcm tp hcm ho chi minh saigon sai gon', false),
	('80000000-0000-4000-8000-000000000003', 'VN', 'Vietnam', 'Da Nang', 'Da Nang, Vietnam', 'da-nang', ARRAY['Đà Nẵng', 'DN'], 'da nang vietnam dn', false),
	('80000000-0000-4000-8000-000000000004', 'VN', 'Vietnam', 'Hai Phong', 'Hai Phong, Vietnam', 'hai-phong', ARRAY['Hải Phòng', 'HP'], 'hai phong vietnam hp', false),
	('80000000-0000-4000-8000-000000000005', 'VN', 'Vietnam', 'Can Tho', 'Can Tho, Vietnam', 'can-tho', ARRAY['Cần Thơ', 'CT'], 'can tho vietnam ct', false),
	('80000000-0000-4000-8000-000000000006', 'VN', 'Vietnam', 'Hue', 'Hue, Vietnam', 'hue', ARRAY['Huế'], 'hue vietnam', false),
	('80000000-0000-4000-8000-000000000007', 'VN', 'Vietnam', 'Online', 'Online', 'online', ARRAY['Remote', 'Work from home', 'WFH'], 'online remote work from home wfh vietnam', true)
ON CONFLICT ("countryCode", "slug") DO NOTHING;