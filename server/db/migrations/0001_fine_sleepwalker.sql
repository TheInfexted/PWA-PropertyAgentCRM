CREATE TABLE `invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspace_id` int NOT NULL,
	`email` varchar(255) NOT NULL,
	`role` enum('owner','agent') NOT NULL DEFAULT 'agent',
	`token` varchar(48) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`accepted_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `invites_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE INDEX `idx_invite_ws_email` ON `invites` (`workspace_id`,`email`);