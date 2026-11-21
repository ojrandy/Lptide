CREATE TABLE `affiliate_clicks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`affiliateId` integer NOT NULL,
	`landingPath` text DEFAULT '' NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`affiliateId`) REFERENCES `affiliates`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `affiliate_clicks_affiliate_idx` ON `affiliate_clicks` (`affiliateId`);--> statement-breakpoint
CREATE TABLE `affiliate_commissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`affiliateId` integer NOT NULL,
	`orderId` integer NOT NULL,
	`baseCents` integer NOT NULL,
	`percent` integer NOT NULL,
	`amountCents` integer NOT NULL,
	`status` text DEFAULT 'EARNED' NOT NULL,
	`payoutId` integer,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`affiliateId`) REFERENCES `affiliates`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payoutId`) REFERENCES `affiliate_payouts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `affiliate_commissions_orderId_unique` ON `affiliate_commissions` (`orderId`);--> statement-breakpoint
CREATE INDEX `affiliate_commissions_affiliate_idx` ON `affiliate_commissions` (`affiliateId`);--> statement-breakpoint
CREATE TABLE `affiliate_payouts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`affiliateId` integer NOT NULL,
	`amountCents` integer NOT NULL,
	`method` text DEFAULT '' NOT NULL,
	`reference` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`adminId` integer,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`affiliateId`) REFERENCES `affiliates`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`adminId`) REFERENCES `admins`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `affiliate_payouts_affiliate_idx` ON `affiliate_payouts` (`affiliateId`);--> statement-breakpoint
CREATE TABLE `affiliates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`customerId` integer NOT NULL,
	`code` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`commissionPercent` integer DEFAULT 10 NOT NULL,
	`website` text DEFAULT '' NOT NULL,
	`audience` text DEFAULT '' NOT NULL,
	`payoutDetails` text DEFAULT '' NOT NULL,
	`adminNote` text DEFAULT '' NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`decidedAt` integer,
	FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `affiliates_customerId_unique` ON `affiliates` (`customerId`);--> statement-breakpoint
CREATE UNIQUE INDEX `affiliates_code_unique` ON `affiliates` (`code`);--> statement-breakpoint
CREATE TABLE `customer_addresses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`customerId` integer NOT NULL,
	`label` text DEFAULT '' NOT NULL,
	`name` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`country` text NOT NULL,
	`addressLine1` text NOT NULL,
	`addressLine2` text DEFAULT '' NOT NULL,
	`city` text NOT NULL,
	`region` text DEFAULT '' NOT NULL,
	`postalCode` text DEFAULT '' NOT NULL,
	`isDefault` integer DEFAULT false NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `customer_addresses_customer_idx` ON `customer_addresses` (`customerId`);--> statement-breakpoint
CREATE TABLE `customer_carts` (
	`customerId` integer PRIMARY KEY NOT NULL,
	`warehouseCode` text,
	`lines` text NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`passwordHash` text,
	`googleSub` text,
	`emailVerifiedAt` integer,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`lastLoginAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_email_unique` ON `customers` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `customers_googleSub_unique` ON `customers` (`googleSub`);--> statement-breakpoint
CREATE TABLE `product_questions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`productId` integer NOT NULL,
	`customerId` integer,
	`authorName` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`question` text NOT NULL,
	`answer` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`source` text DEFAULT 'customer' NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`answeredAt` integer,
	FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `product_questions_product_idx` ON `product_questions` (`productId`,`status`);--> statement-breakpoint
CREATE INDEX `product_questions_status_idx` ON `product_questions` (`status`);--> statement-breakpoint
CREATE TABLE `product_reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`productId` integer NOT NULL,
	`customerId` integer,
	`orderId` integer,
	`authorName` text NOT NULL,
	`rating` integer NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`content` text NOT NULL,
	`reviewDate` text NOT NULL,
	`verified` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`source` text DEFAULT 'customer' NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `product_reviews_product_idx` ON `product_reviews` (`productId`,`status`);--> statement-breakpoint
CREATE INDEX `product_reviews_status_idx` ON `product_reviews` (`status`);--> statement-breakpoint
CREATE TABLE `product_translations` (
	`productId` integer NOT NULL,
	`locale` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`subtitle` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`productId`, `locale`),
	FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `shipping_rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`warehouseCode` text NOT NULL,
	`name` text NOT NULL,
	`countries` text NOT NULL,
	`minGrams` integer DEFAULT 0 NOT NULL,
	`maxGrams` integer,
	`minItems` integer DEFAULT 1 NOT NULL,
	`maxItems` integer,
	`mode` text NOT NULL,
	`firstCents` integer NOT NULL,
	`additionalCents` integer DEFAULT 0 NOT NULL,
	`stepGrams` integer DEFAULT 500 NOT NULL,
	`freeOverCents` integer,
	`sort` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`warehouseCode`) REFERENCES `warehouses`(`code`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `shipping_rules_warehouse_idx` ON `shipping_rules` (`warehouseCode`);--> statement-breakpoint
ALTER TABLE `orders` ADD `customerId` integer REFERENCES customers(id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `paymentMethod` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `paymentRef` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `paidAt` integer;--> statement-breakpoint
ALTER TABLE `orders` ADD `paymentProof` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `affiliateId` integer REFERENCES affiliates(id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `locale` text DEFAULT 'en' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `orders_paymentRef_unique` ON `orders` (`paymentRef`);--> statement-breakpoint
CREATE INDEX `orders_customer_idx` ON `orders` (`customerId`);--> statement-breakpoint
CREATE INDEX `orders_affiliate_idx` ON `orders` (`affiliateId`);--> statement-breakpoint
ALTER TABLE `product_prices` ADD `stockQty` integer;--> statement-breakpoint
ALTER TABLE `warehouses` ADD `lowStockThreshold` integer DEFAULT 5 NOT NULL;--> statement-breakpoint
-- Data moves (docs/10 V8, V10). Hand-written: must run before the JSON columns are dropped.
-- v1 warehouse shipping rules -> shipping_rules: country overrides first (sort 10), then the base rule (sort 100).
INSERT INTO `shipping_rules` (`warehouseCode`, `name`, `countries`, `mode`, `firstCents`, `additionalCents`, `stepGrams`, `sort`)
SELECT w.code, w.code || ' to ' || o.key, json_array(o.key), json_extract(w.shippingRule, '$.mode'),
       json_extract(o.value, '$.firstCents'), json_extract(o.value, '$.additionalCents'), coalesce(json_extract(w.shippingRule, '$.stepGrams'), 500), 10
  FROM `warehouses` w, json_each(w.shippingRule, '$.overrides') o
 WHERE w.shippingRule IS NOT NULL;--> statement-breakpoint
INSERT INTO `shipping_rules` (`warehouseCode`, `name`, `countries`, `mode`, `firstCents`, `additionalCents`, `stepGrams`, `sort`)
SELECT w.code, w.name || ' standard', '[]', json_extract(w.shippingRule, '$.mode'),
       json_extract(w.shippingRule, '$.firstCents'), json_extract(w.shippingRule, '$.additionalCents'), coalesce(json_extract(w.shippingRule, '$.stepGrams'), 500), 100
  FROM `warehouses` w
 WHERE w.shippingRule IS NOT NULL;--> statement-breakpoint
-- Reviews and Q&A JSON -> tables (imported, approved, keep the live order).
INSERT INTO `product_reviews` (`productId`, `authorName`, `rating`, `title`, `content`, `reviewDate`, `verified`, `status`, `source`, `sort`)
SELECT p.id, json_extract(r.value, '$.authorName'), json_extract(r.value, '$.rating'), coalesce(json_extract(r.value, '$.title'), ''),
       json_extract(r.value, '$.content'), substr(coalesce(json_extract(r.value, '$.date'), ''), 1, 10), 1, 'APPROVED', 'import', r.key
  FROM `products` p, json_each(p.reviews) r;--> statement-breakpoint
INSERT INTO `product_questions` (`productId`, `question`, `answer`, `status`, `source`, `sort`, `answeredAt`)
SELECT p.id, json_extract(q.value, '$.question'), json_extract(q.value, '$.answer'), 'APPROVED', 'import', q.key, unixepoch() * 1000
  FROM `products` p, json_each(p.qa) q;--> statement-breakpoint
-- v1 payment instructions become the first payment method (docs/10 V5).
INSERT OR IGNORE INTO `settings` (`key`, `value`)
SELECT 'paymentMethods', json_array(json_object('id', 'crypto', 'label', 'Crypto (BTC / ETH / USDC)', 'instructions', json_extract(value, '$'), 'enabled', json('true')))
  FROM `settings` WHERE `key` = 'paymentInstructions';--> statement-breakpoint
ALTER TABLE `products` DROP COLUMN `qa`;--> statement-breakpoint
ALTER TABLE `products` DROP COLUMN `reviews`;