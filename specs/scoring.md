# Scoring Spec

## Base Scoring
- Points per round: configurable per group, default [1, 2, 4, 8, 16, 32]
- Each correct pick earns the round's point value

## Upset Bonus
- Per round: configurable multiplier
- Bonus = multiplier × (winner_seed - loser_seed) when higher-seed-number wins
- Example: 12-seed beats 5-seed with bonus=2 → 2 × 7 = 14 extra points

## Tiebreaker
- Predict total combined score of Championship game
- Closest to actual total wins the tiebreak

## Leaderboard Display
- Total score, round-by-round breakdown (must include upset bonuses in round totals)
- Percentile rank
- Best possible finish
- Tiebreaker value
- Clickable usernames link to bracket view

## Scoring Logic
- Shared between client and server in src/lib/scoring.ts
- scorePicks() takes picks, results, settings, regions
- Used by: leaderboard API, group leaderboard API, bracket component score display
