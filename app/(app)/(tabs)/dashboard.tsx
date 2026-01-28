import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  useWindowDimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { authService } from "@/services/auth";
import { useWorkspaceProfile } from "@/hooks/api/use-workspace-profile";
import { calculateRank, RANKS } from "@/utils/business/ranks";
import type { Commercial, Manager } from "@/types/api";

type MetricCardProps = {
  label: string;
  value: string | number;
  icon: keyof typeof Feather.glyphMap;
  accent: string;
  tone: string;
  style?: StyleProp<ViewStyle>;
};

export default function DashboardScreen() {
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const dynamicStyles = useMemo(() => createStyles(isTablet), [isTablet]);
  const MetricCard = ({ label, value, icon, accent, tone, style }: MetricCardProps) => (
    <View style={[dynamicStyles.metricCard, style]}>
      <View style={[dynamicStyles.metricIcon, { backgroundColor: tone }]}>
        <Feather name={icon} size={16} color={accent} />
      </View>
      <Text style={dynamicStyles.metricValue}>{value}</Text>
      <Text style={dynamicStyles.metricLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );

  const heroAnim = useRef(new Animated.Value(0)).current;
  const highlightAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pointsAnim = useRef(new Animated.Value(0)).current;
  const [animatedPoints, setAnimatedPoints] = useState(0);

  useEffect(() => {
    const loadIdentity = async () => {
      const id = await authService.getUserId();
      const userRole = await authService.getUserRole();
      setUserId(id);
      setRole(userRole);
    };
    void loadIdentity();
  }, []);

  const { data: profile, loading, error } = useWorkspaceProfile(userId, role);

  const isManager = role === "manager";
  const stats = useMemo(() => {
    if (!profile) {
      return { contratsSignes: 0, immeublesVisites: 0, rendezVousPris: 0, refus: 0 };
    }

    const statsArray = isManager
      ? (profile as Manager).personalStatistics || (profile as Manager).statistics || []
      : (profile as Commercial).statistics || [];

    return statsArray.reduce(
      (acc, stat) => ({
        contratsSignes: acc.contratsSignes + (stat.contratsSignes || 0),
        immeublesVisites: acc.immeublesVisites + (stat.immeublesVisites || 0),
        rendezVousPris: acc.rendezVousPris + (stat.rendezVousPris || 0),
        refus: acc.refus + (stat.refus || 0),
      }),
      { contratsSignes: 0, immeublesVisites: 0, rendezVousPris: 0, refus: 0 }
    );
  }, [profile, isManager]);

  const totalPortesProspectees = useMemo(() => {
    const immeubles = profile?.immeubles || [];
    return immeubles.reduce((total, immeuble) => {
      const portes = immeuble.portes || [];
      const prospectees = portes.filter(porte => porte.statut !== "NON_VISITE").length;
      return total + prospectees;
    }, 0);
  }, [profile]);

  const { rank, points } = useMemo(
    () => calculateRank(stats.contratsSignes, stats.rendezVousPris, stats.immeublesVisites),
    [stats]
  );

  const rankProgress = useMemo(() => {
    const currentIndex = RANKS.findIndex(item => item.name === rank.name);
    const nextRank = RANKS[currentIndex + 1] || null;
    if (!nextRank) {
      return { nextRank: null, progressPercent: 100, pointsNeeded: 0 };
    }
    const pointsInCurrent = points - rank.minPoints;
    const pointsTotal = nextRank.minPoints - rank.minPoints;
    const progressPercent = Math.min((pointsInCurrent / pointsTotal) * 100, 100);
    const pointsNeeded = nextRank.minPoints - points;
    return { nextRank, progressPercent, pointsNeeded };
  }, [rank, points]);

  const refusalRate = totalPortesProspectees === 0
    ? 0
    : Math.round((stats.refus / totalPortesProspectees) * 100);

  const displayName = useMemo(() => {
    if (!profile) return "Profil";
    const firstName = profile.prenom?.trim() ?? "";
    const lastName = profile.nom?.trim() ?? "";
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName.length > 0 ? fullName : "Profil";
  }, [profile]);

  const initials = useMemo(() => {
    if (!profile) return "??";
    const first = profile.prenom?.trim()?.[0] ?? "";
    const last = profile.nom?.trim()?.[0] ?? "";
    const label = `${first}${last}`.toUpperCase();
    return label.length > 0 ? label : "??";
  }, [profile]);

  const roleLabel = isManager ? "Manager" : "Commercial";
  const progressPercentLabel = Math.round(rankProgress.progressPercent);
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
    extrapolate: "clamp",
  });

  const heroStyle = {
    opacity: heroAnim,
    transform: [
      {
        translateY: heroAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0],
        }),
      },
    ],
  };

  const highlightStyle = {
    opacity: highlightAnim,
    transform: [
      {
        translateY: highlightAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0],
        }),
      },
    ],
  };

  const statsStyle = {
    opacity: statsAnim,
    transform: [
      {
        translateY: statsAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0],
        }),
      },
    ],
  };

  useEffect(() => {
    Animated.stagger(140, [
      Animated.timing(heroAnim, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(highlightAnim, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(statsAnim, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [heroAnim, highlightAnim, statsAnim]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: rankProgress.progressPercent,
      duration: 780,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [rankProgress.progressPercent, progressAnim]);

  useEffect(() => {
    const id = pointsAnim.addListener(({ value }) => {
      setAnimatedPoints(Math.round(value));
    });
    return () => {
      pointsAnim.removeListener(id);
    };
  }, [pointsAnim]);

  useEffect(() => {
    Animated.timing(pointsAnim, {
      toValue: points,
      duration: 680,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [points, pointsAnim]);

  const columns = width >= 1000 ? 4 : width >= 720 ? 3 : 2;
  const horizontalPadding = isTablet ? 24 : 18;
  const gap = 12;
  const maxWidth = width >= 1100 ? 980 : width >= 900 ? 820 : width;
  const contentWidth = Math.min(width - horizontalPadding * 2, maxWidth);
  const cardWidth = (contentWidth - gap * (columns - 1)) / columns;

  return (
    <ScrollView style={dynamicStyles.container} contentContainerStyle={dynamicStyles.content}>
      <View style={dynamicStyles.backgroundWrap}>
        <View style={dynamicStyles.bgOrbPrimary} pointerEvents="none" />
        <View style={dynamicStyles.bgOrbSecondary} pointerEvents="none" />
        <View style={dynamicStyles.bgOrbAccent} pointerEvents="none" />

        <View style={[dynamicStyles.shell, { maxWidth }]}>
        <View style={dynamicStyles.pageHeader}>
          <View>
            <Text style={dynamicStyles.pageTitle}>Tableau de bord</Text>
            <Text style={dynamicStyles.pageSubtitle}>Vue d'ensemble de votre progression</Text>
          </View>
          <View style={dynamicStyles.pageBadge}>
            <Feather name="activity" size={16} color="#2563EB" />
          </View>
        </View>

        {loading && <Text style={dynamicStyles.helper}>Chargement en cours...</Text>}
        {error && <Text style={dynamicStyles.error}>{error}</Text>}

        {!loading && !error && (
          <>
            <Animated.View style={[dynamicStyles.heroCard, heroStyle]}>
              <View style={dynamicStyles.heroGlow} />
              <View style={dynamicStyles.heroAccent} />
              <View style={dynamicStyles.heroHeader}>
                <View style={dynamicStyles.heroTextBlock}>
                  <Text style={dynamicStyles.heroTitle}>{displayName}</Text>
                  <Text style={dynamicStyles.heroSubtitle}>{roleLabel} · Prospection</Text>
                </View>
                <View style={dynamicStyles.avatar}>
                  <Text style={dynamicStyles.avatarText}>{initials}</Text>
                </View>
              </View>
              <View style={dynamicStyles.heroMetaRow}>
                <View style={dynamicStyles.heroPill}>
                  <Feather name="award" size={14} color="#2563EB" />
                  <Text style={dynamicStyles.heroPillText}>Rang {rank.name}</Text>
                </View>
                <View style={dynamicStyles.heroPill}>
                  <Feather name="star" size={14} color="#F59E0B" />
                  <Text style={dynamicStyles.heroPillText}>{animatedPoints} points</Text>
                </View>
                <View style={dynamicStyles.heroPill}>
                  <Feather name="trending-up" size={14} color="#2563EB" />
                  <Text style={dynamicStyles.heroPillText}>{progressPercentLabel}% prog.</Text>
                </View>
                <View style={dynamicStyles.heroPill}>
                  <Feather name="door-open" size={14} color="#10B981" />
                  <Text style={dynamicStyles.heroPillText}>{totalPortesProspectees} portes</Text>
                </View>
              </View>
            </Animated.View>

            <Animated.View style={[dynamicStyles.highlightCard, highlightStyle]}>
              <View style={dynamicStyles.highlightHeader}>
                <View>
                  <Text style={dynamicStyles.highlightTitle}>Progression du rang</Text>
                  <Text style={dynamicStyles.highlightSubtitle}>
                    {rankProgress.nextRank
                      ? `Objectif : ${rankProgress.nextRank.name}`
                      : "Niveau maximum atteint"}
                  </Text>
                </View>
                <View style={dynamicStyles.progressBadge}>
                  <Text style={dynamicStyles.progressBadgeText}>
                    {progressPercentLabel}%
                  </Text>
                </View>
              </View>
              <View style={dynamicStyles.progressTrack}>
                <Animated.View
                  style={[
                    dynamicStyles.progressFill,
                    {
                      width: progressWidth,
                    },
                  ]}
                />
                <View style={dynamicStyles.progressGlow} />
              </View>
              <View style={dynamicStyles.progressFooter}>
                <View>
                  <Text style={dynamicStyles.progressFooterText}>Prochaine etape</Text>
                  <Text style={dynamicStyles.progressFooterValue}>
                    {rankProgress.nextRank
                      ? `${rankProgress.pointsNeeded} pts restants`
                      : "Top niveau"}
                  </Text>
                </View>
                <View style={dynamicStyles.progressMetaPill}>
                  <Feather name="bar-chart-2" size={14} color="#2563EB" />
                  <Text style={dynamicStyles.progressMetaText}>
                    {stats.contratsSignes + stats.rendezVousPris} actions
                  </Text>
                </View>
              </View>
            </Animated.View>

            <Animated.View style={[dynamicStyles.statsBlock, statsStyle]}>
              <View style={dynamicStyles.sectionHeader}>
                <Text style={dynamicStyles.sectionTitle}>Indicateurs cles</Text>
                <Text style={dynamicStyles.sectionSubtitle}>Periode en cours</Text>
              </View>
              <View style={dynamicStyles.statsGrid}>
                <MetricCard
                  label="Contrats signes"
                  value={stats.contratsSignes}
                  icon="check-circle"
                  accent="#34D399"
                  tone="#DCFCE7"
                  style={{ width: cardWidth }}
                />
                <MetricCard
                  label="Immeubles visites"
                  value={stats.immeublesVisites}
                  icon="home"
                  accent="#60A5FA"
                  tone="#DBEAFE"
                  style={{ width: cardWidth }}
                />
                <MetricCard
                  label="Rendez-vous pris"
                  value={stats.rendezVousPris}
                  icon="calendar"
                  accent="#A78BFA"
                  tone="#EDE9FE"
                  style={{ width: cardWidth }}
                />
                <MetricCard
                  label="Portes prospectees"
                  value={totalPortesProspectees}
                  icon="grid"
                  accent="#F59E0B"
                  tone="#FEF3C7"
                  style={{ width: cardWidth }}
                />
                <MetricCard
                  label="Refus"
                  value={stats.refus}
                  icon="x-circle"
                  accent="#F97316"
                  tone="#FFEDD5"
                  style={{ width: cardWidth }}
                />
                <MetricCard
                  label="Taux de refus"
                  value={`${refusalRate}%`}
                  icon="trending-down"
                  accent="#F87171"
                  tone="#FEE2E2"
                  style={{ width: cardWidth }}
                />
              </View>
            </Animated.View>
          </>
        )}
        </View>
      </View>
    </ScrollView>
  );
}

const createStyles = (isTablet: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#F8FAFC",
    },
    content: {
      paddingTop: isTablet ? 28 : 22,
      paddingHorizontal: isTablet ? 24 : 18,
      paddingBottom: 40,
    },
    backgroundWrap: {
      position: "relative",
    },
    bgOrbPrimary: {
      position: "absolute",
      width: isTablet ? 320 : 240,
      height: isTablet ? 320 : 240,
      borderRadius: 999,
      backgroundColor: "#DBEAFE",
      top: -140,
      left: -120,
      opacity: 0.6,
    },
    bgOrbSecondary: {
      position: "absolute",
      width: isTablet ? 260 : 200,
      height: isTablet ? 260 : 200,
      borderRadius: 999,
      backgroundColor: "#E0E7FF",
      top: 120,
      right: -120,
      opacity: 0.5,
    },
    bgOrbAccent: {
      position: "absolute",
      width: isTablet ? 220 : 170,
      height: isTablet ? 220 : 170,
      borderRadius: 999,
      backgroundColor: "#FDE68A",
      bottom: 120,
      left: -90,
      opacity: 0.35,
    },
    shell: {
      width: "100%",
      alignSelf: "center",
      gap: isTablet ? 22 : 18,
    },
    pageHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
    },
    pageTitle: {
      fontSize: isTablet ? 24 : 20,
      fontWeight: "700",
      color: "#0F172A",
    },
    pageSubtitle: {
      marginTop: 4,
      fontSize: isTablet ? 14 : 12,
      color: "#64748B",
    },
    pageBadge: {
      width: isTablet ? 44 : 38,
      height: isTablet ? 44 : 38,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#EFF6FF",
      borderWidth: 1,
      borderColor: "#DBEAFE",
    },
    helper: {
      fontSize: 13,
      color: "#64748B",
    },
    error: {
      fontSize: 13,
      color: "#DC2626",
    },
    heroCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: isTablet ? 30 : 24,
      padding: isTablet ? 24 : 18,
      borderWidth: 1,
      borderColor: "#E2E8F0",
      overflow: "hidden",
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
    heroGlow: {
      position: "absolute",
      width: isTablet ? 170 : 130,
      height: isTablet ? 170 : 130,
      borderRadius: 999,
      backgroundColor: "#DBEAFE",
      opacity: 0.6,
      top: -60,
      right: -50,
    },
    heroAccent: {
      position: "absolute",
      width: isTablet ? 200 : 160,
      height: isTablet ? 200 : 160,
      borderRadius: 999,
      backgroundColor: "#E0E7FF",
      opacity: 0.45,
      bottom: -90,
      left: -70,
    },
    heroHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
    },
    heroTextBlock: {
      flex: 1,
    },
    heroTitle: {
      fontSize: isTablet ? 32 : 26,
      fontWeight: "700",
      color: "#0F172A",
    },
    heroSubtitle: {
      marginTop: 6,
      fontSize: isTablet ? 14 : 12,
      color: "#64748B",
    },
    avatar: {
      width: isTablet ? 64 : 52,
      height: isTablet ? 64 : 52,
      borderRadius: 999,
      backgroundColor: "#E0F2FE",
      borderWidth: 1,
      borderColor: "#BAE6FD",
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontSize: isTablet ? 20 : 16,
      fontWeight: "700",
      color: "#1D4ED8",
    },
    heroMetaRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: isTablet ? 18 : 14,
    },
    heroPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: "#F1F5F9",
      borderWidth: 1,
      borderColor: "#E2E8F0",
    },
    heroPillText: {
      fontSize: isTablet ? 13 : 11,
      fontWeight: "600",
      color: "#1E293B",
    },
    highlightCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: isTablet ? 26 : 20,
      padding: isTablet ? 22 : 16,
      borderWidth: 1,
      borderColor: "#E2E8F0",
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
    highlightHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    highlightTitle: {
      fontSize: isTablet ? 16 : 14,
      fontWeight: "600",
      color: "#0F172A",
    },
    highlightSubtitle: {
      marginTop: 4,
      fontSize: isTablet ? 13 : 11,
      color: "#64748B",
    },
    progressBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: "#EFF6FF",
      borderWidth: 1,
      borderColor: "#DBEAFE",
    },
    progressBadgeText: {
      fontSize: isTablet ? 13 : 11,
      fontWeight: "700",
      color: "#2563EB",
    },
    progressTrack: {
      marginTop: isTablet ? 16 : 12,
      height: isTablet ? 10 : 8,
      borderRadius: 999,
      backgroundColor: "#E2E8F0",
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 999,
      backgroundColor: "#2563EB",
    },
    progressGlow: {
      position: "absolute",
      right: 8,
      top: -10,
      width: 80,
      height: 28,
      borderRadius: 999,
      backgroundColor: "#BFDBFE",
      opacity: 0.45,
    },
    progressFooter: {
      marginTop: isTablet ? 14 : 10,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    progressFooterText: {
      fontSize: isTablet ? 13 : 11,
      color: "#64748B",
    },
    progressFooterValue: {
      fontSize: isTablet ? 13 : 11,
      fontWeight: "600",
      color: "#0F172A",
    },
    progressMetaPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: "#EFF6FF",
      borderWidth: 1,
      borderColor: "#DBEAFE",
    },
    progressMetaText: {
      fontSize: isTablet ? 12 : 11,
      fontWeight: "600",
      color: "#2563EB",
    },
    statsBlock: {
      gap: isTablet ? 16 : 12,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    sectionTitle: {
      fontSize: isTablet ? 18 : 15,
      fontWeight: "600",
      color: "#0F172A",
    },
    sectionSubtitle: {
      fontSize: isTablet ? 12 : 11,
      color: "#94A3B8",
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    metricCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 18,
      padding: isTablet ? 16 : 12,
      borderWidth: 1,
      borderColor: "#E2E8F0",
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
    metricIcon: {
      width: isTablet ? 36 : 30,
      height: isTablet ? 36 : 30,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    metricValue: {
      marginTop: isTablet ? 12 : 10,
      fontSize: isTablet ? 22 : 18,
      fontWeight: "700",
      color: "#0F172A",
    },
    metricLabel: {
      marginTop: 6,
      fontSize: isTablet ? 12 : 11,
      color: "#64748B",
    },
  });
