CREATE TABLE `watchlist` (
	`user_id` text NOT NULL,
	`anime_key` text NOT NULL,
	`payload` text NOT NULL,
	`state` text DEFAULT 'want' NOT NULL,
	`updated_at` integer NOT NULL,
	`removed` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`user_id`, `anime_key`)
);
