-- +goose Up
-- Dress moves out of bottoms into its own yes/no, which starts on for everyone.
UPDATE users
SET style_preferences = style_preferences || jsonb_build_object(
    'bottoms', (style_preferences -> 'bottoms') - 'dress',
    'include_one_pieces', true
)
WHERE style_preferences IS NOT NULL;

-- +goose Down
-- Dress picks are not restored, since the up migration doesn't keep track of who had one.
UPDATE users
SET style_preferences = style_preferences - 'include_one_pieces'
WHERE style_preferences IS NOT NULL;
