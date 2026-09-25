package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"
)

// UserRepository owns the users table. Rows are created by the application on registration.
type UserRepository interface {
	EnsureExists(ctx context.Context, id uuid.UUID) error
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
