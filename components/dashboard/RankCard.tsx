import { StyleSheet, Text, View } from "react-native";
import type { Rank } from "@/utils/business/ranks";

type RankCardProps = {
  rank: Rank;
  points: number;
  nextRank?: Rank | null;
  progressPercent: number;
  pointsNeeded: number;
};

export default function RankCard({
  rank,
  points,
  nextRank,
  progressPercent,
  pointsNeeded,
}: RankCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Rang</Text>
        <View style={[styles.pointsBadge, { borderColor: rank.accent }]}>
          <Text style={[styles.pointsText, { color: rank.accent }]}>{points} pts</Text>
        </View>
      </View>

      <View style={styles.rankRow}>
        <View style={[styles.rankBadge, { backgroundColor: rank.accent }]} />
        <Text style={styles.rankText}>Rang {rank.name}</Text>
      </View>

      {nextRank ? (
        <View style={styles.progressBlock}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Prochain rang : {nextRank.name}</Text>
            <Text style={styles.progressValue}>{pointsNeeded} pts</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: rank.accent }]} />
          </View>
          <Text style={styles.progressCaption}>{Math.round(progressPercent)}% complete</Text>
        </View>
      ) : (
        <View style={styles.maxRank}>
          <Text style={styles.maxRankText}>Rang maximum atteint</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  pointsBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: "700",
  },
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  rankBadge: {
    width: 16,
    height: 16,
    borderRadius: 5,
  },
  rankText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  progressBlock: {
    marginTop: 12,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressLabel: {
    fontSize: 12,
    color: "#475569",
  },
  progressValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0F172A",
  },
  progressBar: {
    marginTop: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  progressCaption: {
    marginTop: 6,
    fontSize: 11,
    color: "#94A3B8",
  },
  maxRank: {
    marginTop: 12,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#ECFDF3",
  },
  maxRankText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#16A34A",
  },
});
