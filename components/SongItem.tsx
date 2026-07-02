import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { AlbumArt } from "@/components/AlbumArt";
import { usePlayer } from "@/contexts/PlayerContext";
import type { Song } from "@/contexts/PlayerContext";
import { useColors } from "@/hooks/useColors";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface Props {
  song: Song;
  queue: Song[];
  showFolder?: boolean;
}

export function SongItem({ song, queue, showFolder }: Props) {
  const colors = useColors();
  const { currentSong, isPlaying, playSong } = usePlayer();
  const isActive = currentSong?.id === song.id;

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await playSong(song, queue);
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { borderBottomColor: colors.border },
        isActive && { backgroundColor: colors.primary + "12" },
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <AlbumArt title={song.title} size={48} borderRadius={8} />
      <View style={styles.info}>
        <Text
          style={[
            styles.title,
            { color: isActive ? colors.primary : colors.foreground },
          ]}
          numberOfLines={1}
        >
          {song.title}
        </Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]} numberOfLines={1}>
          {showFolder ? `${song.artist} · ${song.albumTitle}` : song.artist}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.duration, { color: colors.mutedForeground }]}>
          {formatDuration(song.duration)}
        </Text>
        {isActive && isPlaying && (
          <Feather name="volume-2" size={14} color={colors.primary} style={styles.icon} />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  info: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    marginBottom: 2,
  },
  sub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  right: {
    alignItems: "flex-end",
    gap: 4,
  },
  duration: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  icon: {
    marginTop: 2,
  },
});
