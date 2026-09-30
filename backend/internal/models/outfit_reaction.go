package models

import (
	"time"

	"github.com/google/uuid"
)

// ReactionKind is one of the fixed values a reaction can hold.
type ReactionKind string

const (
	ReactionLike    ReactionKind = "like"
	ReactionDislike ReactionKind = "dislike"
	ReactionSave    ReactionKind = "save"
)

// OutfitReaction is a row from the outfit_reactions table. Reactions are
// append-only: a user can react to the same outfit multiple times.
type OutfitReaction struct {
	ID        uuid.UUID
	UserID    uuid.UUID
	OutfitID  uuid.UUID
	Kind      ReactionKind
	CreatedAt time.Time
}

// ReactionCounts is the aggregate response for GET .../reactions.
type ReactionCounts struct {
	Like    int `json:"like"`
	Dislike int `json:"dislike"`
	Save    int `json:"save"`
}