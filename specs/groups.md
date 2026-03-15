# Groups Spec

## Overview
Groups let users compete against friends with custom scoring.

## Structure
- Any user can create a group
- Groups have: name, invite_code (8 char hex), scoring_settings, created_by
- "Everyone" group: auto-created, all users auto-joined on register/login, only admin can edit scoring

## Invite Flow
- Creator gets shareable link: `/join/{invite_code}`
- Link shows group name, creator, member count, join button
- If not logged in, shows auth form first

## Scoring Settings
- Per-group: pointsPerRound [R64, R32, S16, E8, FF, Champ] and upsetBonusPerRound (multiplied by seed difference)
- Only group creator can edit (admin for Everyone group)
- Group leaderboard uses group's scoring settings

## Brackets in Groups
- Users can enter multiple brackets into a group
- Group creator sets max_brackets per group
- Group creator can remove brackets from the group
- Group leaderboard shows all brackets with scores
