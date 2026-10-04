PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_cards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`list_id` integer,
	`title` text NOT NULL,
	`content` text,
	`position` real DEFAULT 0 NOT NULL,
	`owner_group_id` integer,
	`owner_list_id` integer,
	`is_image_card` integer DEFAULT false NOT NULL,
	`image_path` text,
	`card_type` text DEFAULT 'standard' NOT NULL,
	`character_fields` text,
	`cover_image` text,
	`image_focal_x` real,
	`image_focal_y` real,
	`color` text,
	`include_in_compile` integer DEFAULT true NOT NULL,
	`comments` text,
	`word_count` integer DEFAULT 0 NOT NULL,
	`word_count_goal` integer,
	`hide_word_count` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`list_id`) REFERENCES `lists`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_list_id`) REFERENCES `lists`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_cards`("id", "list_id", "title", "content", "position", "owner_group_id", "owner_list_id", "is_image_card", "image_path", "card_type", "character_fields", "cover_image", "image_focal_x", "image_focal_y", "color", "include_in_compile", "comments", "word_count", "word_count_goal", "hide_word_count", "created_at", "updated_at") SELECT "id", "list_id", "title", "content", "position", NULL, NULL, "is_image_card", "image_path", "card_type", "character_fields", "cover_image", "image_focal_x", "image_focal_y", "color", "include_in_compile", "comments", "word_count", "word_count_goal", "hide_word_count", "created_at", "updated_at" FROM `cards`;--> statement-breakpoint
DROP TABLE `cards`;--> statement-breakpoint
ALTER TABLE `__new_cards` RENAME TO `cards`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `cards_owner_group_uniq` ON `cards` (`owner_group_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `cards_owner_list_uniq` ON `cards` (`owner_list_id`);--> statement-breakpoint
ALTER TABLE `writing_settings` ADD `sticky_board_header` integer DEFAULT true NOT NULL;