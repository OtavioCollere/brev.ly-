CREATE TABLE "links" (
	"id" uuid PRIMARY KEY NOT NULL,
	"original_url" text NOT NULL,
	"short_url" varchar(60) NOT NULL,
	"access_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "links_short_url_unique" UNIQUE("short_url")
);
--> statement-breakpoint
CREATE INDEX "links_created_at_idx" ON "links" USING btree ("created_at");