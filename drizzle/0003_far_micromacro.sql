CREATE TABLE `flightBookings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tripId` int,
	`visitId` int,
	`employeeId` int,
	`employeeName` varchar(255),
	`airline` varchar(255) NOT NULL,
	`flightNumber` varchar(50) NOT NULL,
	`originAirport` varchar(10) NOT NULL,
	`destinationAirport` varchar(10) NOT NULL,
	`originCity` varchar(120),
	`destinationCity` varchar(120),
	`departureDateTime` timestamp NOT NULL,
	`arrivalDateTime` timestamp,
	`seat` varchar(10),
	`gate` varchar(10),
	`bookingCode` varchar(50),
	`passengerName` varchar(255),
	`value` decimal(10,2) NOT NULL DEFAULT '0.00',
	`voucherUrl` text,
	`voucherKey` text,
	`status` enum('confirmada','pendente','cancelada') NOT NULL DEFAULT 'pendente',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `flightBookings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `documents` MODIFY COLUMN `category` enum('veiculo','condutor','voucher','passagem','visita','cliente') NOT NULL;--> statement-breakpoint
ALTER TABLE `trips` MODIFY COLUMN `transportMode` enum('carro_empresa','transporte_publico','app','aviao') NOT NULL DEFAULT 'carro_empresa';--> statement-breakpoint
ALTER TABLE `visits` MODIFY COLUMN `transportMode` enum('carro_empresa','transporte_publico','app','aviao');