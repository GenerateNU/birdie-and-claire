package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"example_project/internal/errs"
	"example_project/internal/models"

	"github.com/google/uuid"
)

// UserRepository owns the users table. Rows are created by the application on registration.
type UserRepository interface {
	EnsureExists(ctx context.Context, id uuid.UUID) error
	GetByID(ctx context.Context, id uuid.UUID) (models.User, error)
	SetProfilePictureKey(ctx context.Context, id uuid.UUID, key string) error
}

var _ UserRepository = (*userRepository)(nil)

type userRepository struct {
	db *sql.DB
}

func NewUserRepository(database *sql.DB) UserRepository {
	return &userRepository{db: database}
}

// EnsureExists creates the row for a supabase user missing from our users table.
// The id is the sub claim that supabase uses
func (r *userRepository) EnsureExists(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO users (id)
		VALUES ($1)
		ON CONFLICT (id) DO NOTHING
	`, id)
	if err != nil {
		return fmt.Errorf("ensure user %s: %w", id, err)
	}
	return nil
}

func (r *userRepository) GetByID(ctx context.Context, id uuid.UUID) (models.User, error) {
	var (
		user models.User
		key  sql.NullString
	)
	err := r.db.QueryRowContext(ctx, `
		SELECT id, COALESCE(name, ''), profile_picture_key
		FROM users
		WHERE id = $1
	`, id).Scan(&user.ID, &user.Name, &key)
	if errors.Is(err, sql.ErrNoRows) {
		return models.User{}, errs.ErrNotFound
	}
	if err != nil {
		return models.User{}, fmt.Errorf("get user %s: %w", id, err)
	}
	if key.Valid {
		user.ProfilePictureKey = &key.String
	}
	return user, nil
}

func (r *userRepository) SetProfilePictureKey(ctx context.Context, id uuid.UUID, key string) error {
	result, err := r.db.ExecContext(ctx, `
		UPDATE users
		SET profile_picture_key = $1, updated_at = now()
		WHERE id = $2
	`, key, id)
	if err != nil {
		return fmt.Errorf("set profile picture key for user %s: %w", id, err)
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("set profile picture key for user %s: %w", id, err)
	}
	if affected == 0 {
		return errs.ErrNotFound
	}
	return nil
}
