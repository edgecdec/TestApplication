/** ESPN CDN team logo URLs — free, no API key needed */

const ESPN_LOGO_BASE = "https://a.espncdn.com/i/teamlogos/ncaa/500";

/** ESPN team IDs for logo URLs */
const ESPN_TEAM_IDS: Record<string, number> = {
  "Duke": 150, "Alabama": 333, "Wisconsin": 275, "Arizona": 12, "Oregon": 2483,
  "BYU": 252, "St. Marys": 2608, "Mississippi St.": 344, "Baylor": 239,
  "Vanderbilt": 238, "VCU": 2670, "Liberty": 2335, "Akron": 2006, "Montana": 149,
  "Robert Morris": 2523, "American": 44, "Florida": 57, "St. Johns": 2599,
  "Texas Tech": 2641, "Maryland": 120, "Memphis": 235, "Missouri": 142,
  "Kansas": 2305, "UConn": 41, "Boise St.": 68, "Arkansas": 8, "Drake": 2181,
  "Colorado St.": 36, "Yale": 43, "Lipscomb": 288, "Omaha": 2350,
  "Norfolk St.": 2450, "Auburn": 2, "Michigan St.": 127, "Iowa St.": 66,
  "Texas A&M": 245, "Michigan": 130, "Ole Miss": 145, "Marquette": 269,
  "Louisville": 97, "Creighton": 156, "New Mexico": 167, "San Diego St.": 21,
  "UC San Diego": 5765, "Charleston": 2127, "Troy": 2653, "Bryant": 2803,
  "Alabama St.": 2011, "Houston": 248, "Tennessee": 2633, "Kentucky": 96,
  "Purdue": 2509, "Clemson": 228, "Illinois": 356, "UCLA": 26, "Gonzaga": 2250,
  "Georgia": 61, "Texas": 251, "NC State": 152, "McNeese": 2377,
  "High Point": 2272, "Wofford": 2747, "SIU Edwardsville": 2565, "SIUE": 2565,
  "North Carolina": 153, "Villanova": 222, "Syracuse": 183, "Indiana": 84,
  "Ohio St.": 194, "Iowa": 2294, "Virginia": 258, "Pittsburgh": 221,
  "West Virginia": 277, "Oklahoma": 201, "TCU": 2628, "Xavier": 2752,
  "Dayton": 2168, "Nevada": 2440, "Colorado": 38, "USC": 30, "Stanford": 24,
  "Georgetown": 46, "Providence": 2507, "Seton Hall": 2550, "Butler": 2086,
  "Cincinnati": 2132, "Rutgers": 164, "Penn St.": 213, "Minnesota": 135,
  "Northwestern": 77, "Nebraska": 158, "Wake Forest": 154, "Florida St.": 52,
  "Miami": 2390, "Virginia Tech": 259, "Georgia Tech": 59, "LSU": 99,
  "Mississippi": 145, "South Carolina": 2579, "Oklahoma St.": 197,
  "Kansas St.": 2306, "Washington": 264, "Oregon St.": 204, "Arizona St.": 9,
  "Utah": 254, "SMU": 2567, "Tulane": 2655, "North Texas": 249,
  "San Francisco": 2539, "Saint Louis": 139, "Davidson": 2166, "Richmond": 257,
  "George Mason": 2244, "Loyola Chicago": 2350, "Murray St.": 2413,
  "Vermont": 261, "Iona": 314, "Oral Roberts": 198, "Colgate": 2142,
};

/** Returns ESPN CDN logo URL for a team, or undefined if not mapped */
export function getTeamLogoUrl(teamName: string): string | undefined {
  const id = ESPN_TEAM_IDS[teamName];
  return id ? `${ESPN_LOGO_BASE}/${id}.png` : undefined;
}
