"use client";

import { getTeamLogoUrl } from "@/lib/team-logos";

interface TeamLogoProps {
  team: string;
  size?: number;
}

/** Displays a small team logo from ESPN CDN. Renders nothing if team not mapped. */
export default function TeamLogo({ team, size = 16 }: TeamLogoProps) {
  const url = getTeamLogoUrl(team);
  if (!url) return null;
  return (
    <img
      src={url}
      alt=""
      width={size}
      height={size}
      className="inline-block object-contain flex-shrink-0"
      loading="lazy"
    />
  );
}
