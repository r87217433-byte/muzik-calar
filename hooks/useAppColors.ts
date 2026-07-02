import colors from "@/constants/colors";
import { useSettings } from "@/contexts/SettingsContext";

export function useAppColors() {
  const { darkMode } = useSettings();
  const isDark = darkMode === "dark" || (darkMode === "system" && false);
  const palette =
    isDark && "dark" in colors
      ? (colors as Record<string, typeof colors.light>).dark
      : colors.light;
  return { ...palette, radius: colors.radius, isDark };
}
