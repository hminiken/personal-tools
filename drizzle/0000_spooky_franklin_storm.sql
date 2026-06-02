CREATE TABLE `images` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pattern_id` integer,
	`project_id` integer,
	`image_path` text NOT NULL,
	FOREIGN KEY (`pattern_id`) REFERENCES `patterns`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `patterns` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`source_url` text,
	`source_links` text,
	`cover_image_path` text,
	`pattern_text` text,
	`materials` text,
	`abbreviations` text,
	`sizing` text,
	`pattern_notes` text,
	`categories` text,
	`status` text,
	`hook_sizes` text,
	`yarn_weights` text,
	`yarn_yardage` integer,
	`created_at` integer,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_url` text,
	`pattern_id` integer NOT NULL,
	`title` text NOT NULL,
	`yarn_used` text,
	`colors` text,
	`categories` text,
	`status` text,
	`hook_sizes` text,
	`yarn_weights` text,
	`annotated_pattern` text,
	`project_notes` text,
	`ruler_position` integer DEFAULT 0,
	`cover_image_path` text,
	`created_at` integer,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`pattern_id`) REFERENCES `patterns`(`id`) ON UPDATE no action ON DELETE no action
);
