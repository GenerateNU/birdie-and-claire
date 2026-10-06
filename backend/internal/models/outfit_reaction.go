package models

// ReactionKind is one of the fixed values a reaction can hold.
type ReactionKind string

const (
	ReactionLike    ReactionKind = "like"
	ReactionDislike ReactionKind = "dislike"
	ReactionSave    ReactionKind = "save"
)

// ReactionCounts is the aggregate response for GET .../reactions.
type ReactionCounts struct {
	Like    int `json:"like"`
	Dislike int `json:"dislike"`
	Save    int `json:"save"`
}
