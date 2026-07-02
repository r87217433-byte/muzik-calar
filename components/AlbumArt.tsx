import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";

const PALETTE = [
  ["#7C3AED", "#A855F7"],
  ["#DB2777", "#EC4899"],
  ["#2563EB", "#60A5FA"],
  ["#059669", "#34D399"],
  ["#D97706", "#FCD34D"],
  ["#DC2626", "#F87171"],
  ["#0891B2", "#38BDF8"],
  ["#7C3AED", "#EC4899"],
];

function getColors(title: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % PALETTE.length;
  return PALETTE[idx];
}

interface Props {
  title: string;
  size: number;
  borderRadius?: number;
}

export function AlbumArt({ title, size, borderRadius = 8 }: Props) {
  const [from, to] = getColors(title);
  const iconSize = Math.round(size * 0.38);

  return (
    <View
      style={[
        styles.container,
        { width: size, height: size, borderRadius, backgroundColor: from },
      ]}
    >
      <View style={[styles.inner, { backgroundColor: to, borderRadius: borderRadius * 0.6 }]}>
        <Feather name="music" size={iconSize} color="rgba(255,255,255,0.9)" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  inner: {
    width: "65%",
    height: "65%",
    alignItems: "center",
    justifyContent: "center",
  },
});
