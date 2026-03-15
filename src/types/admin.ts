export interface TournamentFormData {
  name: string;
  year: number;
  lock_time: string;
}

export interface BracketImportData {
  regions: RegionImport[];
}

export interface RegionImport {
  name: string;
  seeds: SeedImport[];
}

export interface SeedImport {
  seed: number;
  name: string;
}

export interface SyncResult {
  espnGamesFound: number;
  newResultsResolved: number;
  totalResultsResolved: number;
}
