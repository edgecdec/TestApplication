# Bracket Spec

## Overview
The bracket is a 68-team single-elimination tournament displayed as an interactive tree.

## Structure
- 4 regions (East, West, South, Midwest), each with 16 seeds
- First Four: 4 play-in games (2 between 16-seeds, 2 between 11-seeds) shown above the bracket
- Rounds: R64 (32 games) → R32 (16) → Sweet 16 (8) → Elite 8 (4) → Final Four (2) → Championship (1) = 63 games total
- Game IDs: `{region}-{round}-{index}` for regional games, `ff-4-{0|1}` for Final Four, `ff-5-0` for Championship

## Interaction
- Click a team to advance it to the next round
- Changing an earlier pick cascades: clears all downstream picks involving the old winner
- Autofill dropdown (Smart/Chalk/Random) fills only empty slots, never overwrites existing picks
- Unsaved changes warning on navigation away

## Display
- Connector lines between rounds
- Region color coding (East=blue, West=red, South=green, Midwest=orange)
- Team logos from ESPN CDN
- Eliminated teams greyed out
- Correct picks green, incorrect picks red
- Pick distribution percentages shown per matchup (after lock time)
- Championship pick highlighted prominently in center

## Data
- Bracket data stored in tournament.bracket_data as JSON with regions array
- Picks stored per bracket in picks table
- Results stored in tournament.results_data as `{gameId: winnerName}`
