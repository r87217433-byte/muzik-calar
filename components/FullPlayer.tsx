import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AlbumArt } from "@/components/AlbumArt";
import { usePlayer } from "@/contexts/PlayerContext";
import { useColors } from "@/hooks/useColors";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function ProgressBar() {
  const colors = useColors();
  const { position, duration, seekTo } = usePlayer();
  const barWidth = useRef(0);
  const progress = duration > 0 ? position / duration : 0;

  const handleSeek = useCallback(
    (x: number) => {
      if (barWidth.current <= 0 || duration <= 0) return;
      const ratio = Math.max(0, Math.min(1, x / barWidth.current));
      seekTo(ratio * duration);
    },
    [duration, seekTo]
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => handleSeek(e.nativeEvent.locationX),
      onPanResponderMove: (e) => handleSeek(e.nativeEvent.locationX),
    })
  ).current;

  return (
    <View style={styles.progressContainer}>
      <View
        style={[styles.progressTrack, { backgroundColor: "rgba(255,255,255,0.2)" }]}
        onLayout={(e) => { barWidth.current = e.nativeEvent.layout.width; }}
        {...panResponder.panHandlers}
      >
        <View
          style={[
            styles.progressFill,
            { width: `${progress * 100}%`, backgroundColor: "#fff" },
          ]}
        />
        <View
          style={[
            styles.progressThumb,
            {
              left: `${progress * 100}%`,
              backgroundColor: "#fff",
            },
          ]}
        />
      </View>
      <View style={styles.timeRow}>
        <Text style={styles.timeText}>{formatTime(position)}</Text>
        <Text style={styles.timeText}>{formatTime(duration)}</Text>
      </View>
    </View>
  );
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function FullPlayer({ visible, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { currentSong, isPlaying, togglePlayPause, next, prev, seekRelative, queue, playbackSpeed, setPlaybackSpeed } =
    usePlayer();

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();
    }
  }, [visible]);

  const closePlayer = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 280,
      useNativeDriver: true,
    }).start(() => onClose());
  }, [onClose, slideAnim]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (_, gs) => gs.dy > 0,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 8 && Math.abs(gs.dy) > Math.abs(gs.dx),
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) slideAnim.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 120 || gs.vy > 0.8) {
          Animated.timing(slideAnim, {
            toValue: SCREEN_HEIGHT,
            duration: 250,
            useNativeDriver: true,
          }).start(() => onClose());
        } else {
          Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  if (!currentSong) return null;

  const handleControl = async (fn: () => Promise<void>) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await fn();
  };

  const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
  const currentSpeedIdx = SPEEDS.indexOf(playbackSpeed);
  const nextSpeedIdx = (currentSpeedIdx + 1) % SPEEDS.length;

  const artSize = SCREEN_WIDTH * 0.72;

  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="none">
      <Animated.View
        style={[styles.modalContainer, { transform: [{ translateY: slideAnim }] }]}
      >
        <LinearGradient
          colors={["#1A0A3E", "#0A0A12", "#0A0A1A"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 1 }}
        />

        <View
          style={[styles.header, { paddingTop: insets.top + 16 }]}
          {...panResponder.panHandlers}
        >
          <View style={styles.dragHandle} />
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={closePlayer} style={styles.headerBtn} hitSlop={12}>
              <Feather name="chevron-down" size={26} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerLabel}>ŞU AN ÇALIYOR</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                const s = SPEEDS[nextSpeedIdx];
                setPlaybackSpeed(s);
              }}
              style={styles.headerBtn}
              hitSlop={12}
            >
              <Text style={styles.speedText}>{playbackSpeed}x</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.artContainer}>
          <View style={styles.artShadow}>
            <AlbumArt title={currentSong.title} size={artSize} borderRadius={20} />
          </View>
        </View>

        <View style={styles.songInfo}>
          <Text style={styles.songTitle} numberOfLines={2}>
            {currentSong.title}
          </Text>
          <Text style={styles.songArtist} numberOfLines={1}>
            {currentSong.artist}
          </Text>
        </View>

        <ProgressBar />

        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => handleControl(prev)}
            hitSlop={8}
          >
            <Feather name="skip-back" size={30} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => handleControl(() => seekRelative(-10))}
            hitSlop={8}
          >
            <Feather name="rotate-ccw" size={26} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.playButton}
            onPress={() => handleControl(togglePlayPause)}
          >
            <Feather name={isPlaying ? "pause" : "play"} size={34} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => handleControl(() => seekRelative(10))}
            hitSlop={8}
          >
            <Feather name="rotate-cw" size={26} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => handleControl(next)}
            hitSlop={8}
          >
            <Feather name="skip-forward" size={30} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
        </View>

        <View style={[styles.queueInfo, { paddingBottom: insets.bottom + 24 }]}>
          <Text style={styles.queueText}>
            {currentSong.albumTitle}
          </Text>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "#0A0A12",
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignSelf: "center",
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerLabel: {
    fontSize: 11,
    letterSpacing: 1.5,
    color: "rgba(255,255,255,0.5)",
    fontFamily: "Inter_600SemiBold",
  },
  speedText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    fontFamily: "Inter_600SemiBold",
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  artContainer: {
    alignItems: "center",
    paddingVertical: 28,
  },
  artShadow: {
    shadowColor: "#A855F7",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 20,
  },
  songInfo: {
    paddingHorizontal: 32,
    marginBottom: 24,
  },
  songTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    marginBottom: 6,
  },
  songArtist: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
  },
  progressContainer: {
    paddingHorizontal: 32,
    marginBottom: 32,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    position: "relative",
    marginBottom: 8,
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  progressThumb: {
    position: "absolute",
    top: -5,
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: -7,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  timeText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    fontFamily: "Inter_400Regular",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  controlBtn: {
    padding: 10,
    flex: 1,
    alignItems: "center",
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#A855F7",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#A855F7",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
    flex: 1.5,
  },
  queueInfo: {
    alignItems: "center",
    paddingHorizontal: 32,
  },
  queueText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
    fontFamily: "Inter_400Regular",
  },
});
