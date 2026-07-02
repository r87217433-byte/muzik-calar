import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio, AVPlaybackStatus } from "expo-av";
import * as MediaLibrary from "expo-media-library";
import * as Notifications from "expo-notifications";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, AppStateStatus, Platform } from "react-native";

export interface Song {
  id: string;
  title: string;
  artist: string;
  albumTitle: string;
  uri: string;
  duration: number; // seconds
  modificationTime: number;
}

export interface Folder {
  id: string;
  title: string;
  songs: Song[];
}

interface PlayerContextType {
  songs: Song[];
  folders: Folder[];
  recentlyPlayed: Song[];
  isLoading: boolean;
  hasPermission: boolean | null;
  requestPermission: () => Promise<void>;
  refreshLibrary: () => Promise<void>;

  currentSong: Song | null;
  queue: Song[];
  isPlaying: boolean;
  position: number;
  duration: number;
  playbackSpeed: number;
  isFullPlayerOpen: boolean;
  setIsFullPlayerOpen: (open: boolean) => void;

  playSong: (song: Song, queue?: Song[]) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  next: () => Promise<void>;
  prev: () => Promise<void>;
  seekTo: (seconds: number) => Promise<void>;
  seekRelative: (seconds: number) => Promise<void>;
  setPlaybackSpeed: (speed: number) => Promise<void>;
}

const PlayerContext = createContext<PlayerContextType>({
  songs: [],
  folders: [],
  recentlyPlayed: [],
  isLoading: false,
  hasPermission: null,
  requestPermission: async () => {},
  refreshLibrary: async () => {},
  currentSong: null,
  queue: [],
  isPlaying: false,
  position: 0,
  duration: 0,
  playbackSpeed: 1.0,
  isFullPlayerOpen: false,
  setIsFullPlayerOpen: () => {},
  playSong: async () => {},
  togglePlayPause: async () => {},
  next: async () => {},
  prev: async () => {},
  seekTo: async () => {},
  seekRelative: async () => {},
  setPlaybackSpeed: async () => {},
});

const STORAGE_KEY = "player_state_v1";
const RECENTLY_PLAYED_KEY = "recently_played_v1";
const MAX_RECENTLY_PLAYED = 50;
const NOTIFICATION_ID = "now-playing";

function parseTitle(filename: string): { title: string; artist: string } {
  const noExt = filename.replace(/\.[^.]+$/, "");
  const parts = noExt.split(" - ");
  if (parts.length >= 2) {
    return { artist: parts[0].trim(), title: parts.slice(1).join(" - ").trim() };
  }
  return { artist: "Bilinmeyen Sanatçı", title: noExt };
}

function parseFolderName(uri: string): string {
  const parts = uri.split("/");
  return parts[parts.length - 2] || "Müzik";
}

async function loadSongsFromLibrary(): Promise<Song[]> {
  const songs: Song[] = [];
  let after: string | undefined = undefined;
  let hasMore = true;

  while (hasMore) {
    const result = await MediaLibrary.getAssetsAsync({
      mediaType: MediaLibrary.MediaType.audio,
      first: 200,
      after,
      sortBy: [[MediaLibrary.SortBy.modificationTime, false]],
    });

    for (const asset of result.assets) {
      const { title, artist } = parseTitle(asset.filename);
      songs.push({
        id: asset.id,
        title,
        artist,
        albumTitle: parseFolderName(asset.uri),
        uri: asset.uri,
        duration: asset.duration,
        modificationTime: asset.modificationTime,
      });
    }

    hasMore = result.hasNextPage;
    after = result.endCursor;
    if (songs.length >= 2000) break;
  }

  return songs;
}

function groupByFolder(songs: Song[]): Folder[] {
  const map = new Map<string, Song[]>();
  for (const song of songs) {
    const folder = song.albumTitle;
    if (!map.has(folder)) map.set(folder, []);
    map.get(folder)!.push(song);
  }
  const folders: Folder[] = [];
  map.forEach((folderSongs, title) => {
    folders.push({
      id: title,
      title,
      songs: folderSongs,
    });
  });
  return folders.sort((a, b) => a.title.localeCompare(b.title));
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
});

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [queue, setQueue] = useState<Song[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeedState] = useState(1.0);
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);

  const soundRef = useRef<Audio.Sound | null>(null);
  const queueRef = useRef<Song[]>([]);
  const currentIndexRef = useRef<number>(-1);
  const positionRef = useRef<number>(0);
  const speedRef = useRef<number>(1.0);
  const isPlayingRef = useRef<boolean>(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const saveState = useCallback(async (song: Song | null, pos: number) => {
    if (!song) return;
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ songId: song.id, position: pos })
    );
  }, []);

  const addToRecentlyPlayed = useCallback(async (song: Song) => {
    setRecentlyPlayed((prev) => {
      const filtered = prev.filter((s) => s.id !== song.id);
      const updated = [song, ...filtered].slice(0, MAX_RECENTLY_PLAYED);
      AsyncStorage.setItem(RECENTLY_PLAYED_KEY, JSON.stringify(updated.map((s) => s.id)));
      return updated;
    });
  }, []);

  const showNotification = useCallback(async (song: Song, playing: boolean) => {
    try {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("now-playing", {
          name: "Şu an çalıyor",
          importance: Notifications.AndroidImportance.LOW,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          showBadge: false,
          sound: null,
        });
      }

      await Notifications.setNotificationCategoryAsync("playback", [
        {
          identifier: "prev",
          buttonTitle: "⏮",
          options: { opensAppToForeground: false, isDestructive: false, isAuthenticationRequired: false },
        },
        {
          identifier: "toggle",
          buttonTitle: playing ? "⏸" : "▶",
          options: { opensAppToForeground: false, isDestructive: false, isAuthenticationRequired: false },
        },
        {
          identifier: "next",
          buttonTitle: "⏭",
          options: { opensAppToForeground: false, isDestructive: false, isAuthenticationRequired: false },
        },
      ]);

      await Notifications.scheduleNotificationAsync({
        identifier: NOTIFICATION_ID,
        content: {
          title: song.title,
          body: song.artist,
          categoryIdentifier: "playback",
          sticky: true,
          data: { type: "now-playing" },
          ...(Platform.OS === "android" ? { channelId: "now-playing" } : {}),
        },
        trigger: null,
      });
    } catch {}
  }, []);

  const dismissNotification = useCallback(async () => {
    try {
      await Notifications.dismissNotificationAsync(NOTIFICATION_ID);
    } catch {}
  }, []);

  const onPlaybackStatusUpdate = useCallback(
    async (status: AVPlaybackStatus) => {
      if (!status.isLoaded) return;
      const posSeconds = (status.positionMillis ?? 0) / 1000;
      positionRef.current = posSeconds;
      setPosition(posSeconds);
      setDuration((status.durationMillis ?? 0) / 1000);
      setIsPlaying(status.isPlaying);
      isPlayingRef.current = status.isPlaying;

      if (status.didJustFinish) {
        const q = queueRef.current;
        const idx = currentIndexRef.current;
        if (idx < q.length - 1) {
          const nextSong = q[idx + 1];
          currentIndexRef.current = idx + 1;
          await loadAndPlay(nextSong, false);
        } else {
          setIsPlaying(false);
          isPlayingRef.current = false;
        }
      }
    },
    []
  );

  const loadAndPlay = useCallback(
    async (song: Song, autoPlay = true) => {
      try {
        if (soundRef.current) {
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        }

        setCurrentSong(song);
        positionRef.current = 0;
        setPosition(0);

        const { sound } = await Audio.Sound.createAsync(
          { uri: song.uri },
          {
            shouldPlay: autoPlay,
            progressUpdateIntervalMillis: 500,
            rate: speedRef.current,
            shouldCorrectPitch: true,
          }
        );
        soundRef.current = sound;
        sound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
        setIsPlaying(autoPlay);
        isPlayingRef.current = autoPlay;

        addToRecentlyPlayed(song);
        if (autoPlay) showNotification(song, true);
        await saveState(song, 0);
      } catch (e) {
        console.warn("loadAndPlay error", e);
      }
    },
    [onPlaybackStatusUpdate, addToRecentlyPlayed, showNotification, saveState]
  );

  const playSong = useCallback(
    async (song: Song, newQueue?: Song[]) => {
      const q = newQueue ?? [song];
      const idx = q.findIndex((s) => s.id === song.id);
      queueRef.current = q;
      currentIndexRef.current = idx >= 0 ? idx : 0;
      setQueue(q);
      await loadAndPlay(song);
    },
    [loadAndPlay]
  );

  const togglePlayPause = useCallback(async () => {
    const sound = soundRef.current;
    if (!sound) return;
    if (isPlayingRef.current) {
      await sound.pauseAsync();
      setIsPlaying(false);
      isPlayingRef.current = false;
      await saveState(currentSong, positionRef.current);
    } else {
      await sound.playAsync();
      setIsPlaying(true);
      isPlayingRef.current = true;
      if (currentSong) showNotification(currentSong, true);
    }
  }, [currentSong, saveState, showNotification]);

  const next = useCallback(async () => {
    const q = queueRef.current;
    const idx = currentIndexRef.current;
    if (idx < q.length - 1) {
      currentIndexRef.current = idx + 1;
      await loadAndPlay(q[idx + 1]);
    }
  }, [loadAndPlay]);

  const prev = useCallback(async () => {
    const q = queueRef.current;
    const idx = currentIndexRef.current;
    if (positionRef.current > 3) {
      await soundRef.current?.setPositionAsync(0);
    } else if (idx > 0) {
      currentIndexRef.current = idx - 1;
      await loadAndPlay(q[idx - 1]);
    } else {
      await soundRef.current?.setPositionAsync(0);
    }
  }, [loadAndPlay]);

  const seekTo = useCallback(async (seconds: number) => {
    const sound = soundRef.current;
    if (!sound) return;
    const clamped = Math.max(0, Math.min(seconds, duration));
    await sound.setPositionAsync(clamped * 1000);
    positionRef.current = clamped;
    await saveState(currentSong, clamped);
  }, [duration, currentSong, saveState]);

  const seekRelative = useCallback(
    async (seconds: number) => {
      await seekTo(positionRef.current + seconds);
    },
    [seekTo]
  );

  const requestPermission = useCallback(async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    const granted = status === MediaLibrary.PermissionStatus.GRANTED;
    setHasPermission(granted);
    if (granted) refreshLibrary();
  }, []);

  const refreshLibrary = useCallback(async () => {
    setIsLoading(true);
    try {
      const allSongs = await loadSongsFromLibrary();
      setSongs(allSongs);
      setFolders(groupByFolder(allSongs));
      const recentlyPlayedRaw = await AsyncStorage.getItem(RECENTLY_PLAYED_KEY);
      if (recentlyPlayedRaw) {
        const ids: string[] = JSON.parse(recentlyPlayedRaw);
        const songMap = new Map(allSongs.map((s) => [s.id, s]));
        const recent = ids.map((id) => songMap.get(id)).filter(Boolean) as Song[];
        setRecentlyPlayed(recent);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await Audio.setAudioModeAsync({
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        allowsRecordingIOS: false,
      });

      const { status } = await MediaLibrary.getPermissionsAsync();
      const granted = status === MediaLibrary.PermissionStatus.GRANTED;
      setHasPermission(granted);

      if (granted) {
        const allSongs = await loadSongsFromLibrary();
        setSongs(allSongs);
        setFolders(groupByFolder(allSongs));

        const recentlyPlayedRaw = await AsyncStorage.getItem(RECENTLY_PLAYED_KEY);
        if (recentlyPlayedRaw) {
          const ids: string[] = JSON.parse(recentlyPlayedRaw);
          const songMap = new Map(allSongs.map((s) => [s.id, s]));
          const recent = ids.map((id) => songMap.get(id)).filter(Boolean) as Song[];
          setRecentlyPlayed(recent);
        }

        const savedRaw = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedRaw) {
          try {
            const saved = JSON.parse(savedRaw);
            const song = allSongs.find((s) => s.id === saved.songId);
            if (song && saved.position > 0) {
              const startPos = Math.max(0, (saved.position - 2)) * 1000;
              const { sound } = await Audio.Sound.createAsync(
                { uri: song.uri },
                { shouldPlay: false, positionMillis: startPos, progressUpdateIntervalMillis: 500 }
              );
              soundRef.current = sound;
              sound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
              setCurrentSong(song);
              positionRef.current = saved.position;
              setPosition(saved.position);
              const idx = allSongs.findIndex((s) => s.id === saved.songId);
              queueRef.current = allSongs;
              currentIndexRef.current = idx >= 0 ? idx : 0;
              setQueue(allSongs);
            }
          } catch {}
        }
      }
    })();
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const action = response.actionIdentifier;
      if (action === "prev") prev();
      else if (action === "toggle") togglePlayPause();
      else if (action === "next") next();
    });
    return () => sub.remove();
  }, [prev, togglePlayPause, next]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (
        appStateRef.current.match(/active/) &&
        state.match(/background|inactive/)
      ) {
        saveState(currentSong, positionRef.current);
      }
      appStateRef.current = state;
    });
    return () => sub.remove();
  }, [currentSong, saveState]);

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
      dismissNotification();
    };
  }, []);

  const setPlaybackSpeed = useCallback(async (speed: number) => {
    speedRef.current = speed;
    setPlaybackSpeedState(speed);
    try {
      if (soundRef.current) {
        await soundRef.current.setRateAsync(speed, true);
      }
    } catch {}
    await AsyncStorage.setItem("player_speed", String(speed));
  }, []);

  useEffect(() => {
    AsyncStorage.getItem("player_speed").then((val) => {
      if (val) {
        const speed = parseFloat(val);
        if (!isNaN(speed)) {
          speedRef.current = speed;
          setPlaybackSpeedState(speed);
        }
      }
    });
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        songs,
        folders,
        recentlyPlayed,
        isLoading,
        hasPermission,
        requestPermission,
        refreshLibrary,
        currentSong,
        queue,
        isPlaying,
        position,
        duration,
        playbackSpeed,
        isFullPlayerOpen,
        setIsFullPlayerOpen,
        playSong,
        togglePlayPause,
        next,
        prev,
        seekTo,
        seekRelative,
        setPlaybackSpeed,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  return useContext(PlayerContext);
}
