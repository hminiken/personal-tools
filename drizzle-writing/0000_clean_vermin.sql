CREATE TABLE `boards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`title` text NOT NULL,
	`position` real DEFAULT 0 NOT NULL,
	`background_image` text,
	`background_credit` text,
	`theme_id` integer,
	`line_height` text,
	`space_before` text,
	`space_after` text,
	`font_family` text,
	`font_size` text,
	`paragraph_indent` text,
	`smart_quotes` integer,
	`word_count_goal` integer,
	`word_count_display_mode` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `writing_projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`theme_id`) REFERENCES `writing_themes`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `card_images` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`card_id` integer NOT NULL,
	`path` text NOT NULL,
	`position` real DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `card_labels` (
	`card_id` integer NOT NULL,
	`label_id` integer NOT NULL,
	PRIMARY KEY(`card_id`, `label_id`),
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`label_id`) REFERENCES `labels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `card_links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_card_id` integer NOT NULL,
	`target_card_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`source_card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `card_links_uniq` ON `card_links` (`source_card_id`,`target_card_id`);--> statement-breakpoint
CREATE TABLE `cards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`list_id` integer NOT NULL,
	`title` text NOT NULL,
	`content` text,
	`position` real DEFAULT 0 NOT NULL,
	`is_image_card` integer DEFAULT false NOT NULL,
	`image_path` text,
	`card_type` text DEFAULT 'standard' NOT NULL,
	`character_fields` text,
	`cover_image` text,
	`color` text,
	`include_in_compile` integer DEFAULT true NOT NULL,
	`comments` text,
	`word_count` integer DEFAULT 0 NOT NULL,
	`word_count_goal` integer,
	`hide_word_count` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`list_id`) REFERENCES `lists`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`board_id` integer NOT NULL,
	`title` text NOT NULL,
	`color` text,
	`position` real DEFAULT 0 NOT NULL,
	`background_image` text,
	`background_credit` text,
	`word_count_goal` integer,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `label_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`name` text NOT NULL,
	`single_select` integer DEFAULT false NOT NULL,
	`position` real DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `writing_projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `labels` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`category_id` integer,
	`name` text NOT NULL,
	`color` text DEFAULT 'gray' NOT NULL,
	`drives_card_color` integer DEFAULT false NOT NULL,
	`position` real DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `writing_projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `label_categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `lists` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group_id` integer NOT NULL,
	`title` text NOT NULL,
	`position` real DEFAULT 0 NOT NULL,
	`word_count_goal` integer,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `writing_folders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`parent_folder_id` integer,
	`name` text NOT NULL,
	`cover_image` text,
	`color` text,
	`position` real DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`parent_folder_id`) REFERENCES `writing_folders`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `writing_projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`folder_id` integer,
	`title` text NOT NULL,
	`description` text,
	`cover_image` text,
	`status` text,
	`categories` text,
	`word_count_goal` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`folder_id`) REFERENCES `writing_folders`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `writing_settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`word_count_display_mode` text DEFAULT 'off' NOT NULL,
	`default_card_word_goal` integer,
	`default_list_word_goal` integer,
	`default_group_word_goal` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `writing_themes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`definition` text DEFAULT '{}' NOT NULL,
	`is_builtin` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
