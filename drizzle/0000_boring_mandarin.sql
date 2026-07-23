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
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyName` varchar(255) NOT NULL,
	`cnpj` varchar(20),
	`zipCode` varchar(10),
	`address` text,
	`city` varchar(120),
	`state` varchar(4),
	`responsibleName` varchar(255) NOT NULL,
	`responsibleEmail` varchar(320) NOT NULL,
	`phone` varchar(30),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` enum('veiculo','condutor','voucher','passagem','visita','cliente','despesa') NOT NULL,
	`refId` int,
	`name` varchar(255) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` text NOT NULL,
	`mimeType` varchar(100),
	`fileSize` int,
	`uploadedBy` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `drivers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int,
	`fullName` varchar(255) NOT NULL,
	`cpf` varchar(20),
	`cnhNumber` varchar(20),
	`cnhCategory` varchar(4),
	`cnhExpiry` timestamp,
	`bloodType` varchar(5),
	`zipCode` varchar(10),
	`address` text,
	`email` varchar(320),
	`photoUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `drivers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(30),
	`zipCode` varchar(10),
	`role` enum('tecnico','especialista','administrador') NOT NULL DEFAULT 'tecnico',
	`position` varchar(255),
	`department` varchar(255),
	`hireDate` timestamp,
	`status` enum('ativo','inativo') NOT NULL DEFAULT 'ativo',
	`photoUrl` text,
	`passwordHash` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employees_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tripId` int,
	`visitId` int,
	`employeeId` int,
	`employeeName` varchar(255),
	`category` enum('transporte','hospedagem','alimentacao','outros') NOT NULL,
	`description` varchar(255),
	`amount` decimal(10,2) NOT NULL,
	`status` enum('pendente','aprovado','rejeitado') NOT NULL DEFAULT 'pendente',
	`receiptUrl` text,
	`receiptKey` text,
	`approvedBy` varchar(255),
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
CREATE TABLE `hotelReservations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tripId` int,
	`visitId` int,
	`hotelName` varchar(255) NOT NULL,
	`city` varchar(120) NOT NULL,
	`checkIn` timestamp NOT NULL,
	`checkOut` timestamp NOT NULL,
	`confirmationNumber` varchar(100),
	`value` decimal(10,2) NOT NULL DEFAULT '0.00',
	`observations` text,
	`status` enum('confirmada','pendente','cancelada') NOT NULL DEFAULT 'pendente',
	`voucherUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hotelReservations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trips` (
	`id` int AUTO_INCREMENT NOT NULL,
	`visitId` int,
	`employeeId` int,
	`employeeName` varchar(255),
	`transportMode` enum('carro_empresa','transporte_publico','app','aviao') NOT NULL DEFAULT 'carro_empresa',
	`vehicleInfo` varchar(255),
	`departureDate` timestamp NOT NULL,
	`returnDate` timestamp,
	`returnAddress` text,
	`status` enum('planejada','em_andamento','concluida','cancelada') NOT NULL DEFAULT 'planejada',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trips_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin','tecnico','especialista') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`plate` varchar(20) NOT NULL,
	`year` varchar(4),
	`model` varchar(255) NOT NULL,
	`color` varchar(60),
	`crlvExpiry` timestamp,
	`insuranceExpiry` timestamp,
	`inspectionExpiry` timestamp,
	`photoUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vehicles_id` PRIMARY KEY(`id`)
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
CREATE TABLE `visits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int,
	`clientName` varchar(255) NOT NULL,
	`address` text NOT NULL,
	`city` varchar(120) NOT NULL,
	`state` varchar(4),
	`visitDate` timestamp NOT NULL,
	`endDate` timestamp,
	`scheduledTime` varchar(10),
	`visitType` enum('manutencao_preventiva','manutencao_corretiva','consultoria','treinamento') NOT NULL DEFAULT 'manutencao_preventiva',
	`employeeId` int,
	`employeeName` varchar(255),
	`tripId` int,
	`status` enum('agendado','em_andamento','concluido','cancelado') NOT NULL DEFAULT 'agendado',
	`transportMode` enum('carro_empresa','transporte_publico','app','aviao'),
	`description` text,
	`notes` text,
	`clientNotified` int DEFAULT 0,
	`specialistNotified` int DEFAULT 0,
	`technicianNotified` int DEFAULT 0,
	`latitude` varchar(32),
	`longitude` varchar(32),
	`geoTimestamp` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `visits_id` PRIMARY KEY(`id`)
);
