CREATE TABLE `ip_geo` (
	`ip` text PRIMARY KEY NOT NULL,
	`country` text DEFAULT '' NOT NULL,
	`region` text DEFAULT '' NOT NULL,
	`isp` text DEFAULT '' NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `page_views` ADD `ip` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_page_views_ip` ON `page_views` (`ip`);