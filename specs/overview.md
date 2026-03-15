# March Madness Picker — Specs

## What This Is
A website where users fill out NCAA March Madness tournament brackets and compete with friends in groups. Self-hosted, free, no paid services.

## Core Features
- User auth (username/password, bcrypt hashed, JWT sessions)
- 68-team bracket with First Four play-in games
- Click-to-pick interaction with cascade clearing
- Multiple brackets per user with custom names
- Groups with invite links, custom scoring settings, leaderboards
- Upset bonus scoring (multiplier × seed difference)
- Tiebreaker question (predict championship total score)
- Live scores from ESPN public API (free, no auth needed)
- Auto-resolve results from ESPN
- Admin panel for tournament management

## Constraints
- Must be 100% free — no paid APIs, no cloud services, no subscriptions
- Self-hosted on a single server (Node.js + SQLite)
- Must work well on mobile browsers (responsive, not a native app)
- No app store publishing, no OAuth providers, no email services
- Everything runs on one port behind nginx
