export interface SimilarityBracket {
  bracketId: number;
  bracketName: string;
  username: string;
}

export interface SimilarityPair {
  a: number; // bracketId
  b: number; // bracketId
  matching: number;
  total: number;
  percentage: number;
}

export interface SimilarityData {
  brackets: SimilarityBracket[];
  pairs: SimilarityPair[];
  mostSimilar: SimilarityPair | null;
  mostDifferent: SimilarityPair | null;
}
