// POST /api/v1/recommend accepts only these values, from the same lists in
// backend/internal/models/recommendation.go. TestOccasionOptionsMatchTheBackend reads this file
// as text and fails when the lists differ, so keep each one a plain literal.

export const weathers = [
  "hot",
  "warm",
  "chilly",
  "cold",
  "rainy",
  "windy",
  "snowy",
  "storm",
] as const;

export const vibes = ["professional", "chic", "casual", "sophisticated", "colorful"] as const;
