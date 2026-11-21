-- Client's official messaging links (2026-11-21): Telegram group and WhatsApp. Editable afterwards in Admin > Settings.
UPDATE `settings` SET `value` = json_set(`value`, '$.telegram', 'https://t.me/LPPeptide_00012', '$.whatsapp', 'https://wa.me/16162742128') WHERE `key` = 'contact';
