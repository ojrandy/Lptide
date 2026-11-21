ALTER TABLE `orders` ADD `handlingCents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `warehouses` ADD `shippingRule` text;