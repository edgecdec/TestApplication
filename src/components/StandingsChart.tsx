"use client";

import { useState, useMemo } from "react";
import type { StandingsHistoryData } from "@/types/standings-history";

const CHART_COLORS = [
  "#2563eb", "#dc2626", "#16a34a", "#ea580c", "#8b5cf6",
  "#ec4899", "#0891b2", "#ca8a04", "#6366f1", "#14b8a6",
  "#f43f5e", "#84cc16", "#a855f7", "#f97316", "#06b6d4",
];

const PADDING = { top: 30, right: 120, bottom: 40, left: 40 };
const CHART_WIDTH = 700;
const CHART_HEIGHT = 350;
const INNER_W = CHART_WIDTH - PADDING.left - PADDING.right;
const INNER_H = CHART_HEIGHT - PADDING.top - PADDING.bottom;
const DOT_RADIUS = 5;
const HOVER_RADIUS = 8;

interface Props {
  data: StandingsHistoryData;
}

export default function StandingsChart({ data }: Props) {
  const [hoveredBracket, setHoveredBracket] = useState<number | null>(null);
  const [hoveredRound, setHoveredRound] = useState<number | null>(null);

  const { brackets, rounds } = data;
  const maxRank = brackets.length;

  const xScale = useMemo(() => {
    if (rounds.length <= 1) return (i: number) => PADDING.left + INNER_W / 2;
    return (i: number) => PADDING.left + (i / (rounds.length - 1)) * INNER_W;
  }, [rounds.length]);

  const yScale = useMemo(() => {
    // Rank 1 at top, maxRank at bottom
    if (maxRank <= 1) return () => PADDING.top + INNER_H / 2;
    return (rank: number) => PADDING.top + ((rank - 1) / (maxRank - 1)) * INNER_H;
  }, [maxRank]);

  if (rounds.length === 0) {
    return <p className="text-gray-500 text-sm">No results yet — standings chart will appear after games are played.</p>;
  }

  const colorMap = new Map(brackets.map((b, i) => [b.bracketId, CHART_COLORS[i % CHART_COLORS.length]]));

  return (
    <div>
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="w-full max-w-3xl"
        style={{ fontFamily: "system-ui, sans-serif" }}
      >
        {/* Grid lines */}
        {Array.from({ length: maxRank }, (_, i) => i + 1).map((rank) => (
          <line
            key={rank}
            x1={PADDING.left}
            y1={yScale(rank)}
            x2={PADDING.left + INNER_W}
            y2={yScale(rank)}
            stroke="#e5e7eb"
            strokeWidth={0.5}
          />
        ))}

        {/* Y-axis labels (ranks) */}
        {Array.from({ length: maxRank }, (_, i) => i + 1).map((rank) => (
          <text
            key={rank}
            x={PADDING.left - 8}
            y={yScale(rank)}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize={11}
            fill="#9ca3af"
          >
            #{rank}
          </text>
        ))}

        {/* X-axis labels (round names) */}
        {rounds.map((r, i) => (
          <text
            key={r.round}
            x={xScale(i)}
            y={CHART_HEIGHT - 8}
            textAnchor="middle"
            fontSize={10}
            fill="#6b7280"
          >
            {r.roundName}
          </text>
        ))}

        {/* Lines and dots for each bracket */}
        {brackets.map((b) => {
          const color = colorMap.get(b.bracketId) ?? "#999";
          const isHovered = hoveredBracket === b.bracketId;
          const dimmed = hoveredBracket !== null && !isHovered;
          const opacity = dimmed ? 0.15 : 1;

          const points = rounds.map((r, i) => ({
            x: xScale(i),
            y: yScale(r.rankings[b.bracketId] ?? maxRank),
            rank: r.rankings[b.bracketId] ?? maxRank,
            score: r.scores[b.bracketId] ?? 0,
            roundIdx: i,
          }));

          const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

          return (
            <g key={b.bracketId} opacity={opacity}>
              <path
                d={pathD}
                fill="none"
                stroke={color}
                strokeWidth={isHovered ? 3 : 1.5}
                strokeLinejoin="round"
              />
              {points.map((p) => (
                <circle
                  key={p.roundIdx}
                  cx={p.x}
                  cy={p.y}
                  r={isHovered && hoveredRound === p.roundIdx ? HOVER_RADIUS : DOT_RADIUS}
                  fill={color}
                  stroke="white"
                  strokeWidth={1.5}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => { setHoveredBracket(b.bracketId); setHoveredRound(p.roundIdx); }}
                  onMouseLeave={() => { setHoveredBracket(null); setHoveredRound(null); }}
                />
              ))}
            </g>
          );
        })}

        {/* Tooltip */}
        {hoveredBracket !== null && hoveredRound !== null && (() => {
          const b = brackets.find((br) => br.bracketId === hoveredBracket);
          const r = rounds[hoveredRound];
          if (!b || !r) return null;
          const rank = r.rankings[b.bracketId] ?? "?";
          const score = r.scores[b.bracketId] ?? 0;
          const x = xScale(hoveredRound);
          const y = yScale(typeof rank === "number" ? rank : maxRank);
          const tooltipX = x + 10;
          const tooltipY = Math.max(PADDING.top, y - 30);
          return (
            <g>
              <rect x={tooltipX} y={tooltipY} width={150} height={42} rx={4} fill="rgba(0,0,0,0.85)" />
              <text x={tooltipX + 8} y={tooltipY + 15} fontSize={11} fill="white" fontWeight={600}>
                {b.username} — {b.bracketName}
              </text>
              <text x={tooltipX + 8} y={tooltipY + 32} fontSize={10} fill="#d1d5db">
                #{rank} · {score} pts · {r.roundName}
              </text>
            </g>
          );
        })()}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3">
        {brackets.map((b) => {
          const color = colorMap.get(b.bracketId) ?? "#999";
          return (
            <button
              key={b.bracketId}
              className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded transition ${
                hoveredBracket === b.bracketId ? "bg-gray-200 dark:bg-gray-700" : "hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
              onMouseEnter={() => setHoveredBracket(b.bracketId)}
              onMouseLeave={() => setHoveredBracket(null)}
            >
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="truncate max-w-[120px]">{b.username}</span>
              <span className="text-gray-400 truncate max-w-[80px]">({b.bracketName})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
