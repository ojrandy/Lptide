CREATE TABLE `admins` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`passwordHash` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`lastLoginAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admins_email_unique` ON `admins` (`email`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`heroTitle` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`introMd` text DEFAULT '' NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_unique` ON `categories` (`slug`);--> statement-breakpoint
CREATE TABLE `order_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`orderId` integer NOT NULL,
	`fromStatus` text,
	`toStatus` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`adminId` integer,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`adminId`) REFERENCES `admins`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `order_events_order_idx` ON `order_events` (`orderId`);--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`orderId` integer NOT NULL,
	`productId` integer NOT NULL,
	`sku` text NOT NULL,
	`name` text NOT NULL,
	`specification` text DEFAULT '' NOT NULL,
	`unitCents` integer NOT NULL,
	`listCents` integer NOT NULL,
	`qty` integer NOT NULL,
	`lineCents` integer NOT NULL,
	FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `order_items_order_idx` ON `order_items` (`orderId`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`number` text NOT NULL,
	`status` text DEFAULT 'PENDING_PAYMENT' NOT NULL,
	`warehouseCode` text NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`country` text NOT NULL,
	`addressLine1` text NOT NULL,
	`addressLine2` text DEFAULT '' NOT NULL,
	`city` text NOT NULL,
	`region` text DEFAULT '' NOT NULL,
	`postalCode` text DEFAULT '' NOT NULL,
	`customerNote` text DEFAULT '' NOT NULL,
	`subtotalCents` integer NOT NULL,
	`shippingCents` integer NOT NULL,
	`totalCents` integer NOT NULL,
	`trackingNumber` text,
	`carrier` text,
	`adminNote` text DEFAULT '' NOT NULL,
	`ip` text DEFAULT '' NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`warehouseCode`) REFERENCES `warehouses`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_number_unique` ON `orders` (`number`);--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `orders_email_idx` ON `orders` (`email`);--> statement-breakpoint
CREATE INDEX `orders_created_idx` ON `orders` (`createdAt`);--> statement-breakpoint
CREATE TABLE `product_prices` (
	`productId` integer NOT NULL,
	`warehouseCode` text NOT NULL,
	`priceCents` integer NOT NULL,
	`listCents` integer NOT NULL,
	`inStock` integer DEFAULT true NOT NULL,
	PRIMARY KEY(`productId`, `warehouseCode`),
	FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`warehouseCode`) REFERENCES `warehouses`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `product_prices_warehouse_idx` ON `product_prices` (`warehouseCode`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`shortName` text DEFAULT '' NOT NULL,
	`subtitle` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`categoryId` integer NOT NULL,
	`sku` text NOT NULL,
	`specification` text DEFAULT '' NOT NULL,
	`packageSize` text DEFAULT '' NOT NULL,
	`amountMg` real,
	`weightKg` real,
	`images` text NOT NULL,
	`coaUrl` text,
	`tags` text NOT NULL,
	`rating` real DEFAULT 0 NOT NULL,
	`reviewCount` integer DEFAULT 0 NOT NULL,
	`qaCount` integer DEFAULT 0 NOT NULL,
	`glance` text NOT NULL,
	`sections` text NOT NULL,
	`qa` text NOT NULL,
	`reviews` text NOT NULL,
	`ratingBreakdown` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_slug_unique` ON `products` (`slug`);--> statement-breakpoint
CREATE INDEX `products_category_idx` ON `products` (`categoryId`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `warehouses` (
	`code` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`tagline` text DEFAULT '' NOT NULL,
	`countries` text NOT NULL,
	`shippingFee` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL
);
