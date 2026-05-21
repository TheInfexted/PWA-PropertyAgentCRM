CREATE TABLE `activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspace_id` int NOT NULL,
	`lead_id` int NOT NULL,
	`type` enum('created','call','whatsapp','status_change','note','assigned','imported') NOT NULL,
	`detail` json,
	`actor_user_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspace_id` int NOT NULL,
	`name` varchar(200) NOT NULL DEFAULT '',
	`phone_e164` varchar(32),
	`phone_raw` varchar(40),
	`phone_valid` boolean NOT NULL DEFAULT false,
	`area` varchar(120) NOT NULL DEFAULT '',
	`status_id` int,
	`remarks` text,
	`assigned_to` int,
	`source` enum('manual','import','whatsapp','propertyguru','iproperty','facebook','referral','walkin') NOT NULL DEFAULT 'manual',
	`email` varchar(255),
	`intent` enum('buy','rent','sell','invest'),
	`property_type` varchar(80),
	`budget_min` int,
	`budget_max` int,
	`next_follow_up_at` timestamp,
	`tags` json,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `statuses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspace_id` int NOT NULL,
	`label` varchar(80) NOT NULL,
	`color` varchar(16) NOT NULL DEFAULT '#6b7280',
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `statuses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(255) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`name` varchar(120) NOT NULL DEFAULT '',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `workspace_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspace_id` int NOT NULL,
	`user_id` int NOT NULL,
	`role` enum('owner','agent') NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workspace_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_member` UNIQUE(`workspace_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`settings` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workspaces_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_act_ws_lead` ON `activities` (`workspace_id`,`lead_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_lead_ws_status` ON `leads` (`workspace_id`,`status_id`);--> statement-breakpoint
CREATE INDEX `idx_lead_ws_assigned` ON `leads` (`workspace_id`,`assigned_to`);--> statement-breakpoint
CREATE INDEX `idx_lead_ws_follow` ON `leads` (`workspace_id`,`next_follow_up_at`);--> statement-breakpoint
CREATE INDEX `idx_lead_ws_phone` ON `leads` (`workspace_id`,`phone_e164`);--> statement-breakpoint
CREATE INDEX `idx_status_ws` ON `statuses` (`workspace_id`);