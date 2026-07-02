import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Appearance, Platform } from "react-native";

export type DarkMode = "system" | "light" | "dark";

function applyScheme(mode: DarkMode) {
  if (Platform.OS === "web") return;
  if (mode === "system") Appearance.setColorScheme(null);
  else Appearance.setColorScheme(mode === "dark" ? "dark" : "light");
}

interface SettingsContextType {
  darkMode: DarkMode;
  setDarkMode: (mode: DarkMode) => void;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
}

const SettingsContext = createContext<SettingsContextType>({
  darkMode: "dark",
  setDarkMode: () => {},
  playbackSpeed: 1.0,
  setPlaybackSpeed: () => {},
});

const STORAGE_KEY = "settings_v1";

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [darkMode, setDarkModeState] = useState<DarkMode>("dark");
  const [playbackSpeed, setPlaybackSpeedState] = useState(1.0);

  useEffect(() => {
    applyScheme("dark");
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const data = JSON.parse(raw);
          if (data.darkMode) {
            setDarkModeState(data.darkMode);
            applyScheme(data.darkMode);
          }
          if (data.playbackSpeed) setPlaybackSpeedState(data.playbackSpeed);
        } catch {}
      }
    });
  }, []);

  const setDarkMode = useCallback((mode: DarkMode) => {
    setDarkModeState(mode);
    applyScheme(mode);
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      const existing = raw ? JSON.parse(raw) : {};
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, darkMode: mode }));
    });
  }, []);

  const setPlaybackSpeed = useCallback((speed: number) => {
    setPlaybackSpeedState(speed);
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      const existing = raw ? JSON.parse(raw) : {};
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, playbackSpeed: speed }));
    });
  }, []);

  return (
    <SettingsContext.Provider value={{ darkMode, setDarkMode, playbackSpeed, setPlaybackSpeed }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
