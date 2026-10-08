package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"birdie-and-claire/internal/errs"
	"birdie-and-claire/internal/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
)

const uniqueViolation = "23505"

// UserRepository owns the users table.
type UserRepository interface {
	Create(ctx context.Context, id uuid.UUID, name string) (models.User, error)
	GetByID(ctx context.Context, id uuid.UUID) (models.User, error)
	SetProfilePictureKey(ctx context.Context, id uuid.UUID, key string) error
}

type userRepository struct {
	db *sql.DB
}

func NewUserRepository(database *sql.DB) UserRepository {
	return &userRepository{db: database}
}

func (r *userRepository) Create(ctx context.Context, id uuid.UUID, name string) (models.User, error) {
	var user models.User
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO users (id, name)
		VALUES ($1, $2)
		RETURNING id, name, profile_picture_key
	`, id, name).Scan(&user.ID, &user.Name, &user.ProfilePictureKey)
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == uniqueViolation {
		return models.User{}, fmt.Errorf("create user %s: %w", id, errs.ErrDuplicate)
	}
	if err != nil {
		return models.User{}, fmt.Errorf("create user %s: %w", id, err)
	}
	return user, nil
}

func (r *userRepository) GetByID(ctx context.Context, id uuid.UUID) (models.User, error) {
	var user models.User
	err := r.db.QueryRowContext(ctx, `
		SELECT id, COALESCE(name, ''), profile_picture_key
		FROM users
		WHERE id = $1
	`, id).Scan(&user.ID, &user.Name, &user.ProfilePictureKey)
	if errors.Is(err, sql.ErrNoRows) {
		return models.User{}, errs.ErrNotFound
	}
	if err != nil {
		return models.User{}, fmt.Errorf("get user %s: %w", id, err)
	}
	return user, nil
}

func (r *userRepository) SetProfilePictureKey(ctx context.Context, id uuid.UUID, key string) error {
	var updated uuid.UUID
	err := r.db.QueryRowContext(ctx, `
		UPDATE users
		SET profile_picture_key = $1, updated_at = now()
		WHERE id = $2
		RETURNING id
	`, key, id).Scan(&updated)
	if errors.Is(err, sql.ErrNoRows) {
		return errs.ErrNotFound
	}
	if err != nil {
		return fmt.Errorf("set profile picture key for user %s: %w", id, err)
	}
	return nil
}
