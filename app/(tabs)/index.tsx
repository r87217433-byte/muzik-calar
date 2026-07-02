import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AlbumArt } from "@/components/AlbumArt";
import { FullPlayer } from "@/components/FullPlayer";
import { MiniPlayer } from "@/components/MiniPlayer";
import type { Folder, Song } from "@/contexts/PlayerContext";
import { usePlayer } from "@/contexts/PlayerContext";
import type { DarkMode } from "@/contexts/SettingsContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useColors } from "@/hooks/useColors";

type TopTab = "listeler" | "sarkilar" | "sanatcilar" | "albumler";

type SubView =
  | { type: "recent" }
  | { type: "new" }
  | { type: "folder"; folder: Folder }
  | { type: "artist"; name: string; songs: Song[] }
  | { type: "album"; name: string; songs: Song[] }
  | { type: "folders_list" };

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function SongRow({ song, queue }: { song: Song; queue: Song[] }) {
  const colors = useColors();
  const { currentSong, isPlaying, playSong } = usePlayer();
  const isActive = currentSong?.id === song.id;

  return (
    <TouchableOpacity
      style={[styles.songRow, { borderBottomColor: colors.separator }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        playSong(song, queue);
      }}
      activeOpacity={0.6}
    >
      <AlbumArt title={song.title} size={44} borderRadius={4} />
      <View style={styles.songInfo}>
        <Text
          style={[styles.songTitle, { color: isActive ? colors.tabActive : colors.foreground }]}
          numberOfLines={1}
        >
          {song.title}
        </Text>
        <Text style={[styles.songSub, { color: colors.mutedForeground }]} numberOfLines={1}>
          {song.artist}
        </Text>
      </View>
      <Text style={[styles.songDur, { color: colors.mutedForeground }]}>
        {formatDuration(song.duration)}
      </Text>
      {isActive && isPlaying && (
        <Feather name="volume-2" size={14} color={colors.tabActive} style={{ marginLeft: 6 }} />
      )}
    </TouchableOpacity>
  );
}

function GroupRow({
  title,
  count,
  subtitle,
  onPress,
}: {
  title: string;
  count?: number;
  subtitle?: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[styles.groupRow, { borderBottomColor: colors.separator }]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <View style={styles.groupInfo}>
        <Text style={[styles.groupTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.groupSub, { color: colors.mutedForeground }]}>
          {subtitle ?? (count !== undefined ? `${count} şarkı` : "")}
        </Text>
      </View>
      <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

function SettingsModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useColors();
  const { darkMode, setDarkMode } = useSettings();
  const { playbackSpeed, setPlaybackSpeed } = usePlayer();
  const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
  const themes: { label: string; value: DarkMode }[] = [
    { label: "Sistem", value: "system" },
    { label: "Açık", value: "light" },
    { label: "Koyu", value: "dark" },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} onPress={onClose} activeOpacity={1}>
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.settingsSheet, { backgroundColor: colors.card }]}
        >
          <View style={[styles.settingsDrag, { backgroundColor: colors.mutedForeground }]} />
          <Text style={[styles.settingsTitle, { color: colors.foreground }]}>Ayarlar</Text>

          <Text style={[styles.settingsLabel, { color: colors.mutedForeground }]}>TEMA</Text>
          <View style={styles.themeRow}>
            {themes.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[
                  styles.themeBtn,
                  {
                    backgroundColor:
                      darkMode === t.value ? colors.foreground : colors.secondary,
                  },
                ]}
                onPress={() => setDarkMode(t.value)}
              >
                <Text
                  style={[
                    styles.themeBtnText,
                    { color: darkMode === t.value ? colors.background : colors.mutedForeground },
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.settingsLabel, { color: colors.mutedForeground }]}>
            OYNATMA HIZI
          </Text>
          <View style={styles.speedRow}>
            {SPEEDS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.speedBtn,
                  {
                    backgroundColor:
                      playbackSpeed === s ? colors.foreground : colors.secondary,
                  },
                ]}
                onPress={() => setPlaybackSpeed(s)}
              >
                <Text
                  style={[
                    styles.speedBtnText,
                    { color: playbackSpeed === s ? colors.background : colors.mutedForeground },
                  ]}
                >
                  {s}x
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: colors.secondary }]}
            onPress={onClose}
          >
            <Text style={[styles.closeBtnText, { color: colors.foreground }]}>Kapat</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

export default function MainScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    songs,
    folders,
    recentlyPlayed,
    isLoading,
    hasPermission,
    requestPermission,
    refreshLibrary,
    currentSong,
  } = usePlayer();

  const [activeTab, setActiveTab] = useState<TopTab>("listeler");
  const [subView, setSubView] = useState<SubView | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fullPlayerOpen, setFullPlayerOpen] = useState(false);

  const recentlyAdded = useMemo(
    () => [...songs].sort((a, b) => b.modificationTime - a.modificationTime),
    [songs]
  );

  const artists = useMemo(() => {
    const map = new Map<string, Song[]>();
    for (const song of songs) {
      const a = song.artist || "Bilinmeyen";
      if (!map.has(a)) map.set(a, []);
      map.get(a)!.push(song);
    }
    return Array.from(map.entries())
      .map(([name, s]) => ({ name, songs: s }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [songs]);

  const TABS: { key: TopTab; label: string }[] = [
    { key: "listeler", label: "Listeler" },
    { key: "sarkilar", label: "Şarkılar" },
    { key: "sanatcilar", label: "Sanatçılar" },
    { key: "albumler", label: "Albümler" },
  ];

  function getSubViewTitle() {
    if (!subView) return "";
    if (subView.type === "recent") return "En son çalınan";
    if (subView.type === "new") return "En son eklenen";
    if (subView.type === "folders_list") return "Klasör listesi";
    if (subView.type === "folder") return subView.folder.title;
    if (subView.type === "artist") return subView.name;
    if (subView.type === "album") return subView.name;
    return "";
  }

  function getSubViewSongs(): Song[] {
    if (!subView) return [];
    if (subView.type === "recent") return recentlyPlayed;
    if (subView.type === "new") return recentlyAdded;
    if (subView.type === "folder") return subView.folder.songs;
    if (subView.type === "artist") return subView.songs;
    if (subView.type === "album") return subView.songs;
    return [];
  }

  if (!hasPermission) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <Feather name="music" size={56} color={colors.mutedForeground} />
        <Text style={[styles.permTitle, { color: colors.foreground }]}>Müzik</Text>
        <Text style={[styles.permDesc, { color: colors.mutedForeground }]}>
          Cihazınızdaki müziklere erişmek için izin verin
        </Text>
        <TouchableOpacity
          style={[styles.permBtn, { backgroundColor: colors.foreground }]}
          onPress={requestPermission}
        >
          <Text style={[styles.permBtnText, { color: colors.background }]}>İzin Ver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderSubView = () => {
    if (!subView) return null;

    if (subView.type === "folders_list") {
      return (
        <FlatList
          data={folders}
          keyExtractor={(f) => f.id}
          renderItem={({ item }) => (
            <GroupRow
              title={item.title}
              count={item.songs.length}
              onPress={() => setSubView({ type: "folder", folder: item })}
            />
          )}
          contentContainerStyle={{ paddingBottom: currentSong ? 140 : 80 }}
          showsVerticalScrollIndicator={false}
        />
      );
    }

    const songList = getSubViewSongs();
    return (
      <FlatList
        data={songList}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => <SongRow song={item} queue={songList} />}
        contentContainerStyle={{ paddingBottom: currentSong ? 140 : 80 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Şarkı bulunamadı
            </Text>
          </View>
        }
      />
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        {subView ? (
          <>
            <TouchableOpacity
              onPress={() => setSubView(null)}
              hitSlop={12}
              style={styles.headerBack}
            >
              <Feather name="arrow-left" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              {getSubViewTitle()}
            </Text>
            <View style={{ width: 44 }} />
          </>
        ) : (
          <>
            <Text style={[styles.headerBig, { color: colors.foreground }]}>Müzik</Text>
            <View style={styles.headerIcons}>
              <TouchableOpacity style={styles.headerIcon} hitSlop={8}>
                <Feather name="search" size={22} color={colors.foreground} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerIcon}
                hitSlop={8}
                onPress={() => setSettingsOpen(true)}
              >
                <Feather name="more-vertical" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Top Tabs — only when no subview */}
      {!subView && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.tabBar, { borderBottomColor: colors.separator }]}
          contentContainerStyle={styles.tabBarContent}
        >
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={styles.tabItem}
              onPress={() => setActiveTab(t.key)}
            >
              <Text
                style={[
                  styles.tabLabel,
                  { color: activeTab === t.key ? colors.tabActive : colors.mutedForeground },
                ]}
              >
                {t.label}
              </Text>
              {activeTab === t.key && (
                <View style={[styles.tabUnderline, { backgroundColor: colors.tabActive }]} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Content */}
      <View style={{ flex: 1 }}>
        {subView ? (
          renderSubView()
        ) : activeTab === "listeler" ? (
          <ScrollView
            contentContainerStyle={{ paddingBottom: currentSong ? 140 : 80 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={refreshLibrary}
                tintColor={colors.mutedForeground}
              />
            }
          >
            <GroupRow
              title="En son çalınan"
              count={recentlyPlayed.length}
              onPress={() => setSubView({ type: "recent" })}
            />
            <GroupRow
              title="En son eklenen"
              count={recentlyAdded.length}
              onPress={() => setSubView({ type: "new" })}
            />
            <GroupRow
              title="Klasör listesi"
              subtitle={`${folders.length} klasör`}
              onPress={() => setSubView({ type: "folders_list" })}
            />
          </ScrollView>
        ) : activeTab === "sarkilar" ? (
          <FlatList
            data={songs}
            keyExtractor={(s) => s.id}
            renderItem={({ item }) => <SongRow song={item} queue={songs} />}
            contentContainerStyle={{ paddingBottom: currentSong ? 140 : 80 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isLoading} onRefresh={refreshLibrary} tintColor={colors.mutedForeground} />
            }
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  {isLoading ? "Yükleniyor..." : "Şarkı bulunamadı"}
                </Text>
              </View>
            }
          />
        ) : activeTab === "sanatcilar" ? (
          <FlatList
            data={artists}
            keyExtractor={(a) => a.name}
            renderItem={({ item }) => (
              <GroupRow
                title={item.name}
                count={item.songs.length}
                onPress={() => setSubView({ type: "artist", name: item.name, songs: item.songs })}
              />
            )}
            contentContainerStyle={{ paddingBottom: currentSong ? 140 : 80 }}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <FlatList
            data={folders}
            keyExtractor={(f) => f.id}
            renderItem={({ item }) => (
              <GroupRow
                title={item.title}
                subtitle={`${item.songs.length} şarkı`}
                onPress={() => setSubView({ type: "folder", folder: item })}
              />
            )}
            contentContainerStyle={{ paddingBottom: currentSong ? 140 : 80 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Mini Player */}
      {currentSong && (
        <MiniPlayer onExpand={() => setFullPlayerOpen(true)} />
      )}

      {/* Full Player */}
      <FullPlayer visible={fullPlayerOpen} onClose={() => setFullPlayerOpen(false)} />

      {/* Settings */}
      <SettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerBig: { fontSize: 28, fontFamily: "Inter_700Bold" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", flex: 1, textAlign: "center" },
  headerBack: { width: 44, alignItems: "flex-start" },
  headerIcons: { flexDirection: "row", gap: 4 },
  headerIcon: { padding: 8 },
  tabBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexGrow: 0,
  },
  tabBarContent: { paddingHorizontal: 16, gap: 0 },
  tabItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    position: "relative",
  },
  tabLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    left: 8,
    right: 8,
    height: 2,
    borderRadius: 1,
  },
  groupRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  groupInfo: { flex: 1 },
  groupTitle: { fontSize: 16, fontFamily: "Inter_500Medium", marginBottom: 2 },
  groupSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  songRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  songInfo: { flex: 1 },
  songTitle: { fontSize: 14, fontFamily: "Inter_500Medium", marginBottom: 2 },
  songSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  songDur: { fontSize: 12, fontFamily: "Inter_400Regular" },
  permTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
  permDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  permBtn: { paddingHorizontal: 32, paddingVertical: 12, borderRadius: 24, marginTop: 8 },
  permBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  settingsSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    gap: 12,
  },
  settingsDrag: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 8,
    opacity: 0.4,
  },
  settingsTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  settingsLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, marginTop: 8 },
  themeRow: { flexDirection: "row", gap: 8 },
  themeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  themeBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  speedRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  speedBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, minWidth: 56, alignItems: "center" },
  speedBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  closeBtn: { marginTop: 8, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  closeBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
