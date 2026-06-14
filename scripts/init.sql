-- PostgreSQL initialization script
-- Run once on fresh install

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Full-text search optimization for Arabic/French
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Comments
COMMENT ON DATABASE assurances_oued_zem IS 'Système de gestion Assurances Oued Zem';
