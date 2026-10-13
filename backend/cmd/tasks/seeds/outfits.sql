-- Run via mise run db:dev:seed:outfits, or directly with psql -v user_id=<uuid> -v outfit_count=<n> -f outfits.sql.
-- Reruns replace that user's seed outfits.
BEGIN;

-- psql doesn't substitute :'user_id' inside $$, so the DO block reads it from a setting.
SET LOCAL seed.user_id = :'user_id';
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = current_setting('seed.user_id')::uuid) THEN
        RAISE EXCEPTION 'user % has no account; sign in and create it first', current_setting('seed.user_id');
    END IF;
END $$;

DELETE FROM outfits WHERE user_id = :'user_id'::uuid AND name ~ '^Seed outfit [0-9]+$';

INSERT INTO outfits (user_id, name, created_at)
SELECT :'user_id'::uuid, 'Seed outfit ' || seed_number, now() - (seed_number || ' minutes')::interval
FROM generate_series(1, :'outfit_count'::int) seed_number;

COMMIT;
