-- Run via mise run db:dev:seed:outfits, or directly with psql -v user_id=<uuid> -v outfit_count=<n> -f outfits.sql.
-- Reruns replace that user's seed outfits.
BEGIN;

-- outfits.user_id references users, and a Supabase user only gets a row on their first API call.
INSERT INTO users (id) VALUES (:'user_id'::uuid) ON CONFLICT DO NOTHING;

DELETE FROM outfits WHERE user_id = :'user_id'::uuid AND name ~ '^Seed outfit [0-9]+$';

INSERT INTO outfits (user_id, name, created_at)
SELECT :'user_id'::uuid, 'Seed outfit ' || seed_number, now() - (seed_number || ' minutes')::interval
FROM generate_series(1, :'outfit_count'::int) seed_number;

COMMIT;
