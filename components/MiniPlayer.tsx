import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AlbumArt } from "@/components/AlbumArt";
import { usePlayer } from "@/contexts/PlayerContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  onExpand: () => void;
}

export function MiniPlayer({ onExpand }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { currentSong, isPlaying, togglePlayPause, next, prev, seekRelative } = usePlayer();

  if (!currentSong) return null;

  const tap = async (fn: () => Promise<void>) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await fn();
  };

  return (
    <View style={{ backgroundColor: colors.playerBg }}>
      {/* Progress indicator */}
      <View style={[styles.progressBar, { backgroundColor: colors.separator }]}>
        <View style={[styles.progressFill, { backgroundColor: colors.tabActive }]} />
      </View>

      {/* Main row — tap to expand */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onExpand}
        style={[styles.infoRow, { paddingBottom: 6 }]}
      >
        <AlbumArt title={currentSong.title} size={44} borderRadius={4} />
        <View style={styles.textArea}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
            {currentSong.title}
          </Text>
          <Text style={[styles.artist, { color: colors.mutedForeground }]} numberOfLines={1}>
            {currentSong.artist}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Control buttons */}
      <View style={[styles.controls, { paddingBottom: insets.bottom || 12 }]}>
        <TouchableOpacity
          onPress={() => tap(prev)}
          style={styles.ctrlBtn}
          hitSlop={8}
        >
          <Feather name="skip-back" size={22} color={colors.foreground} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => tap(() => seekRelative(-10))}
          style={styles.ctrlBtn}
          hitSlop={8}
        >
          <Feather name="rotate-ccw" size={20} color={colors.foreground} />
          <Text style={[styles.seekLabel, { color: colors.foreground }]}>10</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => tap(togglePlayPause)}
          style={[styles.playBtn, { backgroundColor: colors.foreground }]}
        >
          <Feather
            name={isPlaying ? "pause" : "play"}
            size={26}
            color={colors.background}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => tap(() => seekRelative(10))}
          style={styles.ctrlBtn}
          hitSlop={8}
        >
          <Feather name="rotate-cw" size={20} color={colors.foreground} />
          <Text style={[styles.seekLabel, { color: colors.foreground }]}>10</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => tap(next)}
          style={styles.ctrlBtn}
          hitSlop={8}
        >
          <Feather name="skip-forward" size={22} color={colors.foreground} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  progressBar: {
    height: 2,
    width: "100%",
  },
  progressFill: {
    height: 2,
    width: "30%",
    opacity: 0.7,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 12,
  },
  textArea: { flex: 1 },
  title: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  artist: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  ctrlBtn: {
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 2,
    padding: 8,
    minWidth: 48,
  },
  seekLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
  playBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
