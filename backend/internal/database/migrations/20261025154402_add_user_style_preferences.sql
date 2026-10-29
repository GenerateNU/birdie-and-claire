-- +goose Up
-- NULL means the user has not finished the onboarding preference steps, and the frontend sends
-- them back there. Existing users are left NULL on purpose so they go through it once.
ALTER TABLE users ADD COLUMN style_preferences JSONB;

-- +goose Down
ALTER TABLE users DROP COLUMN style_preferences;
