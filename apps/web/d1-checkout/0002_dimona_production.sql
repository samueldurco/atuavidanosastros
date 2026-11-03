CREATE TABLE IF NOT EXISTS shop_factory_quotes (
 nonce TEXT PRIMARY KEY, variant TEXT NOT NULL, carrier TEXT NOT NULL,
 unit_cents INTEGER NOT NULL, shipping_cents INTEGER NOT NULL,
 address_hash TEXT NOT NULL, expires INTEGER NOT NULL, order_id TEXT UNIQUE
);
CREATE INDEX IF NOT EXISTS shop_factory_quote_expiry ON shop_factory_quotes(expires);
CREATE TABLE IF NOT EXISTS shop_factory_jobs (
 order_id TEXT PRIMARY KEY, stage TEXT NOT NULL CHECK(stage IN ('paid','uncertain','pix_or_production','tracking','done','review','ignored')),
 factory_id TEXT UNIQUE, line_id TEXT, fulfillment_id TEXT, reason TEXT, tries INTEGER NOT NULL DEFAULT 0,
 due INTEGER NOT NULL, lease TEXT, lease_to INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS shop_factory_due ON shop_factory_jobs(stage,due);
CREATE TABLE IF NOT EXISTS shop_factory_cursor (
 id INTEGER PRIMARY KEY CHECK(id=1), since INTEGER NOT NULL, cursor TEXT, started INTEGER NOT NULL
);
