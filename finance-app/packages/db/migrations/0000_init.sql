-- Initial migration for spec 001-cimientos: no business tables yet.
-- Enables pgcrypto so gen_random_uuid() is available for the shared `id`
-- column that every future domain table will use (see schema/shared-columns.ts).
CREATE EXTENSION IF NOT EXISTS pgcrypto;
