CREATE TABLE `auditLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entity` varchar(50) NOT NULL,
	`entityId` int,
	`action` varchar(50) NOT NULL,
	`changedBy` varchar(255),
	`changes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `checklists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`visitId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`items` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `checklists_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `visitEquipment` (
	`id` int AUTO_INCREMENT NOT NULL,
	`visitId` int NOT NULL,
	`equipmentName` varchar(255) NOT NULL,
	`serialNumber` varchar(100),
	`quantity` int NOT NULL DEFAULT 1,
	`status` enum('levado','devolvido','permaneceu') NOT NULL DEFAULT 'levado',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `visitEquipment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `visits` ADD `endDate` timestamp;--> statement-breakpoint
ALTER TABLE `visits` ADD `visitType` enum('manutencao_preventiva','manutencao_corretiva','consultoria','treinamento') DEFAULT 'manutencao_preventiva' NOT NULL;--> statement-breakpoint
ALTER TABLE `visits` ADD `tripId` int;--> statement-breakpoint
ALTER TABLE `visits` ADD `clientNotified` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `visits` ADD `specialistNotified` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `visits` ADD `technicianNotified` int DEFAULT 0;