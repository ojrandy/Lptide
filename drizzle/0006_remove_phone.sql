-- The client no longer has the captured support phone (2026-11-21): clear it so the footer and schema stop showing it.
UPDATE `settings` SET `value` = json_set(`value`, '$.phone', '') WHERE `key` = 'contact';
