import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { scorePicks, buildTeamSeedMap, computeStreak, filterResultsThroughRound, getCompletedRounds } from "@/lib/scoring";
import { parseBracketData, getEliminatedTeams, gameId, gamesInRound, buildR64Matchups } from "@/lib/bracket-utils";
import type { ScoringSettings } from "@/types/group";
import type { Bracket, Tournament, RegionData } from "@/types/tournament";
import type { Picks, Results } from "@/types/bracket";
import type { Award } from "@/types/awards";
import { REGIONS, ROUND_NAMES, CHAMPIONSHIP_GAME_ID } from "@/lib/bracket-constants";

interface BracketWithUser extends Bracket {
  username: string;
}

interface BracketData {
  id: number;
  name: string;
  username: string;
  picks: Picks;
}

function allGameIdsForRound(round: number): string[] {
  const ids: string[] = [];
  if (round <= 3) {
    const count = gamesInRound(round);
    for (const region of REGIONS) {
      for (let i = 0; i < count; i++) ids.push(gameId(region, round, i));
    }
  } else {
    const count = round === 4 ? 2 : 1;
    for (let i = 0; i < count; i++) ids.push(gameId("ff", round, i));
  }
  return ids;
}

function winner(bracketName: string, bracketId: number, username: string, value: string): Award["winner"] {
  return { bracketId, bracketName, username, value };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const group = db.prepare("SELECT scoring_settings FROM groups WHERE id = ?").get(id) as { scoring_settings: string } | undefined;
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  const settings: ScoringSettings = JSON.parse(group.scoring_settings);

  const brackets = db.prepare(`
    SELECT b.*, u.username
    FROM group_brackets gb
    JOIN brackets b ON b.id = gb.bracket_id
    JOIN users u ON u.id = b.user_id
    WHERE gb.group_id = ?
  `).all(id) as BracketWithUser[];

  if (brackets.length === 0) return NextResponse.json({ awards: [] });

  const tournament = db.prepare("SELECT * FROM tournaments WHERE id = ?").get(brackets[0].tournament_id) as Tournament | undefined;
  if (!tournament) return NextResponse.json({ awards: [] });

  const regions: RegionData[] = parseBracketData(tournament.bracket_data);
  const results: Results = JSON.parse(tournament.results_data);
  const seedMap = buildTeamSeedMap(regions);
  const eliminatedTeams = getEliminatedTeams(results, regions);
  const completedRounds = getCompletedRounds(results);

  const bracketData: BracketData[] = brackets.map((b) => ({
    id: b.id,
    name: b.name,
    username: b.username,
    picks: JSON.parse(b.picks) as Picks,
  }));

  const scored = bracketData.map((b) => {
    const rounds = scorePicks(b.picks, results, settings, regions);
    const total = rounds.reduce((s, r) => s + r.points, 0);
    const correctPicks = rounds.reduce((s, r) => s + r.correct, 0);
    return { ...b, rounds, total, correctPicks };
  });

  const awards: Award[] = [];

  // 🏆 Pool Champion — highest total score
  const sortedByTotal = [...scored].sort((a, b) => b.total - a.total);
  if (sortedByTotal.length > 0 && sortedByTotal[0].total > 0) {
    const best = sortedByTotal[0];
    awards.push({ id: "pool_champion", emoji: "🏆", name: "Pool Champion", description: "Highest total score in the group", winner: winner(best.name, best.id, best.username, `${best.total} pts`) });
  }

  // 🔮 Oracle — most correct picks
  const sortedByCorrect = [...scored].sort((a, b) => b.correctPicks - a.correctPicks);
  if (sortedByCorrect.length > 0 && sortedByCorrect[0].correctPicks > 0) {
    const best = sortedByCorrect[0];
    awards.push({ id: "oracle", emoji: "🔮", name: "Oracle", description: "Most correct picks overall", winner: winner(best.name, best.id, best.username, `${best.correctPicks} correct`) });
  }

  // 🎯 Best Round X — highest scorer per completed round
  for (const round of completedRounds) {
    const sortedByRound = [...scored].sort((a, b) => b.rounds[round].points - a.rounds[round].points);
    if (sortedByRound.length > 0 && sortedByRound[0].rounds[round].points > 0) {
      const best = sortedByRound[0];
      awards.push({ id: `best_round_${round}`, emoji: "🎯", name: `Best ${ROUND_NAMES[round]}`, description: `Highest scorer in the ${ROUND_NAMES[round]}`, winner: winner(best.name, best.id, best.username, `${best.rounds[round].points} pts (${best.rounds[round].correct} correct)`) });
    }
  }

  // 📈 Biggest Mover — most rank improvement between any consecutive rounds
  if (completedRounds.length >= 2) {
    let bestMover: { bracket: BracketData; improvement: number; fromRound: number; toRound: number } | null = null;
    for (let ri = 1; ri < completedRounds.length; ri++) {
      const prevRound = completedRounds[ri - 1];
      const currRound = completedRounds[ri];
      const prevResults = filterResultsThroughRound(results, prevRound);
      const currResults = filterResultsThroughRound(results, currRound);

      const prevScored = bracketData.map((b) => ({ id: b.id, total: scorePicks(b.picks, prevResults, settings, regions).reduce((s, r) => s + r.points, 0) }));
      const currScored = bracketData.map((b) => ({ id: b.id, total: scorePicks(b.picks, currResults, settings, regions).reduce((s, r) => s + r.points, 0) }));

      prevScored.sort((a, b) => b.total - a.total);
      currScored.sort((a, b) => b.total - a.total);

      const prevRankMap = new Map<number, number>();
      prevScored.forEach((s, i) => {
        const rank = i > 0 && s.total === prevScored[i - 1].total ? (prevRankMap.get(prevScored[i - 1].id) ?? i + 1) : i + 1;
        prevRankMap.set(s.id, rank);
      });
      const currRankMap = new Map<number, number>();
      currScored.forEach((s, i) => {
        const rank = i > 0 && s.total === currScored[i - 1].total ? (currRankMap.get(currScored[i - 1].id) ?? i + 1) : i + 1;
        currRankMap.set(s.id, rank);
      });

      for (const b of bracketData) {
        const prev = prevRankMap.get(b.id) ?? 0;
        const curr = currRankMap.get(b.id) ?? 0;
        const improvement = prev - curr;
        if (improvement > 0 && (!bestMover || improvement > bestMover.improvement)) {
          bestMover = { bracket: b, improvement, fromRound: prevRound, toRound: currRound };
        }
      }
    }
    if (bestMover) {
      awards.push({ id: "biggest_mover", emoji: "📈", name: "Biggest Mover", description: `Most rank improvement between rounds`, winner: winner(bestMover.bracket.name, bestMover.bracket.id, bestMover.bracket.username, `↑${bestMover.improvement} (${ROUND_NAMES[bestMover.fromRound]} → ${ROUND_NAMES[bestMover.toRound]})`) });
    }
  }

  // 🔥 Hottest Streak — longest correct pick streak
  const streaks = bracketData.map((b) => ({ ...b, streak: computeStreak(b.picks, results) }));
  const sortedByStreak = [...streaks].sort((a, b) => b.streak - a.streak);
  if (sortedByStreak.length > 0 && sortedByStreak[0].streak > 0) {
    const best = sortedByStreak[0];
    awards.push({ id: "hottest_streak", emoji: "🔥", name: "Hottest Streak", description: "Longest consecutive correct pick streak", winner: winner(best.name, best.id, best.username, `${best.streak} in a row`) });
  }

  // 💀 Most Busted — most eliminated future picks
  const bustedCounts = bracketData.map((b) => {
    let busted = 0;
    for (const [gId, pick] of Object.entries(b.picks)) {
      if (!results[gId] && pick && eliminatedTeams.has(pick)) busted++;
    }
    return { ...b, busted };
  });
  const sortedByBusted = [...bustedCounts].sort((a, b) => b.busted - a.busted);
  if (sortedByBusted.length > 0 && sortedByBusted[0].busted > 0) {
    const best = sortedByBusted[0];
    awards.push({ id: "most_busted", emoji: "💀", name: "Most Busted", description: "Most future picks on eliminated teams", winner: winner(best.name, best.id, best.username, `${best.busted} busted picks`) });
  }

  // 🎲 Biggest Gambler — most upsets picked (regardless of correctness)
  const upsetCounts = bracketData.map((b) => {
    let upsets = 0;
    for (const [gId, pick] of Object.entries(b.picks)) {
      if (!pick) continue;
      const parts = gId.split("-");
      const round = parseInt(parts[parts.length - 2], 10);
      const index = parseInt(parts[parts.length - 1], 10);
      const regionName = parts[0];
      if (round === 0 && regionName !== "ff") {
        const region = regions.find((r) => r.name === regionName);
        if (!region) continue;
        const matchups = buildR64Matchups();
        const [topSeed, bottomSeed] = matchups[index];
        const topTeam = region.seeds.find((s) => s.seed === topSeed)?.name;
        const bottomTeam = region.seeds.find((s) => s.seed === bottomSeed)?.name;
        if (pick === bottomTeam && topSeed < bottomSeed) upsets++;
      } else {
        const pickSeed = seedMap.get(pick);
        if (pickSeed == null) continue;
        // For non-R64 games, check if the pick is the lower seed of the two possible teams
        const prevGame0 = round <= 3 ? gameId(regionName, round - 1, index * 2) : undefined;
        const prevGame1 = round <= 3 ? gameId(regionName, round - 1, index * 2 + 1) : undefined;
        if (prevGame0 && prevGame1) {
          const team0 = b.picks[prevGame0] || results[prevGame0];
          const team1 = b.picks[prevGame1] || results[prevGame1];
          if (team0 && team1) {
            const seed0 = seedMap.get(team0);
            const seed1 = seedMap.get(team1);
            if (seed0 != null && seed1 != null && pickSeed > Math.min(seed0, seed1)) upsets++;
          }
        }
      }
    }
    return { ...b, upsets };
  });
  const sortedByUpsets = [...upsetCounts].sort((a, b) => b.upsets - a.upsets);
  if (sortedByUpsets.length > 0 && sortedByUpsets[0].upsets > 0) {
    const best = sortedByUpsets[0];
    awards.push({ id: "biggest_gambler", emoji: "🎲", name: "Biggest Gambler", description: "Most upset picks in the bracket", winner: winner(best.name, best.id, best.username, `${best.upsets} upsets picked`) });
  }

  return NextResponse.json({ awards });
}
