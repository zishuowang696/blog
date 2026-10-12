ALTER TABLE `page_views` ADD `bot` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_page_views_bot` ON `page_views` (`bot`);