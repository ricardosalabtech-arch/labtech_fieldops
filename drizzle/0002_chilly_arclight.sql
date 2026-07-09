ALTER TABLE `employees` ADD `position` varchar(255);--> statement-breakpoint
ALTER TABLE `employees` ADD `department` varchar(255);--> statement-breakpoint
ALTER TABLE `employees` ADD `hireDate` timestamp;--> statement-breakpoint
ALTER TABLE `employees` ADD `status` enum('ativo','inativo') DEFAULT 'ativo' NOT NULL;