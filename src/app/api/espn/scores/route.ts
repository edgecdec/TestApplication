import { NextRequest, NextResponse } from "next/server";
import { fetchEspnScores } from "@/lib/espn";

/**
 * GET /api/espn/scores?dates=YYYYMMDD
 * Public endpoint — returns live/completed ESPN NCAA tournament scores.
 */
export async function GET(req: NextRequest) {
  const dates = req.nextUrl.searchParams.get("dates") ?? undefined;
  const ESPN_NCAA_GROUP = "100";

  const games = await fetchEspnScores(dates, ESPN_NCAA_GROUP);
  return NextResponse.json({ games });
}
