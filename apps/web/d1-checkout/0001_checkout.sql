CREATE TABLE IF NOT EXISTS shop_checkout_attempts (
  nonce TEXT PRIMARY KEY, address_hash TEXT NOT NULL, state TEXT NOT NULL CHECK(state IN ('pending','ready','failed')), checkout_url TEXT, expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS shop_checkout_attempt_expiry ON shop_checkout_attempts (expires);
CREATE TABLE IF NOT EXISTS shop_checkout_limits (
  bucket TEXT PRIMARY KEY, hits INTEGER NOT NULL, expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS shop_checkout_limit_expiry ON shop_checkout_limits (expires);
