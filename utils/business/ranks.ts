export type Rank = {
  name: string;
  minPoints: number;
  maxPoints: number;
  color: string;
  accent: string;
};

export const RANKS: Rank[] = [
  { name: "Bronze", minPoints: 0, maxPoints: 99, color: "#CD7F32", accent: "#F97316" },
  { name: "Silver", minPoints: 100, maxPoints: 249, color: "#C0C0C0", accent: "#94A3B8" },
  { name: "Gold", minPoints: 250, maxPoints: 499, color: "#FFD700", accent: "#EAB308" },
  { name: "Platinum", minPoints: 500, maxPoints: 999, color: "#E5E4E2", accent: "#22D3EE" },
  { name: "Diamond", minPoints: 1000, maxPoints: Infinity, color: "#B9F2FF", accent: "#6366F1" },
];

export function calculateRank(
  contratsSignes = 0,
  rendezVousPris = 0,
  immeublesVisites = 0
): { rank: Rank; points: number } {
  const points = contratsSignes * 50 + rendezVousPris * 10 + immeublesVisites * 5;
  const rank = RANKS.find(r => points >= r.minPoints && points <= r.maxPoints) || RANKS[0];
  return { rank, points };
}
