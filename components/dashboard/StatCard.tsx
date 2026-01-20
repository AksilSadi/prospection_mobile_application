import { Feather } from "@expo/vector-icons";
import { StyleSheet, Text, View, ViewStyle } from "react-native";

type StatCardProps = {
  title: string;
  value: string | number;
  icon: keyof typeof Feather.glyphMap;
  style?: ViewStyle;
};

export default function StatCard({ title, value, icon, style }: StatCardProps) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.iconBadge}>
          <Feather name={icon} size={14} color="#2563EB" />
        </View>
      </View>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  title: {
    fontSize: 11,
    color: "#64748B",
    flex: 1,
  },
  iconBadge: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
  },
  value: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
});
