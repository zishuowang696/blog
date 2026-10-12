CREATE TABLE `page_views` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`path` text NOT NULL,
	`ip_hash` text DEFAULT '' NOT NULL,
	`referer` text DEFAULT '' NOT NULL,
	`ua` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_page_views_created` ON `page_views` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_page_views_path` ON `page_views` (`path`);