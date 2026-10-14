CREATE TABLE `refresh_jobs` (
	`key` text PRIMARY KEY NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`last_success_at` integer,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`run_count` integer DEFAULT 0 NOT NULL,
	`last_error` text
);
--> statement-breakpoint
CREATE TABLE `source_snapshots` (
	`key` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`previous_payload` text,
	`source_url` text NOT NULL,
	`updated_at` integer NOT NULL,
	`attempted_at` integer NOT NULL,
	`last_error` text
);
