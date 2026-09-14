-- Card controls: online/international usage toggles and a settable PIN,
-- common self-service controls in real banking apps.
ALTER TABLE cards ADD COLUMN online_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE cards ADD COLUMN international_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE cards ADD COLUMN pin_hash TEXT;

-- accounts.account_number is already UNIQUE (migration 002), which Postgres
-- backs with an index automatically - no extra index needed for the
-- beneficiary "verify account" lookup added alongside this migration.
